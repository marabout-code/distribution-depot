import 'dart:convert';
import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

part 'database.g.dart';

/// Multi-tenancy DepotScope for strict local partition filtering
abstract class DepotScope {
  const DepotScope();
  const factory DepotScope.all() = _AllDepotScope;
  const factory DepotScope.none() = _NoneDepotScope;
  const factory DepotScope.deposit(String id) = _SingleDepotScope;

  bool matches(String? depositId);
}

class _AllDepotScope extends DepotScope {
  const _AllDepotScope();
  @override
  bool matches(String? depositId) => true;
  @override
  String toString() => 'DepotScope.all()';
}

class _NoneDepotScope extends DepotScope {
  const _NoneDepotScope();
  @override
  bool matches(String? depositId) => depositId == null;
  @override
  String toString() => 'DepotScope.none()';
}

class _SingleDepotScope extends DepotScope {
  final String id;
  const _SingleDepotScope(this.id);
  @override
  bool matches(String? depositId) => depositId == null || depositId == id;
  @override
  String toString() => 'DepotScope.deposit($id)';
}

/// Generic documents table (Single Source of Truth, 100% Offline)
@DataClassName('DocumentRow')
class Documents extends Table {
  TextColumn get collection => text()();
  TextColumn get docId => text()();
  TextColumn get depositId => text().nullable()();
  TextColumn get payload => text()(); // Serialized JSON
  IntColumn get version => integer().withDefault(const Constant(1))();
  DateTimeColumn get localUpdatedAt => dateTime()();
  BoolColumn get dirty => boolean().withDefault(const Constant(true))();
  BoolColumn get deleted => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {collection, docId};
}

/// Auxiliary table for offline 4-digit PIN authentication
@DataClassName('LocalCredentialRow')
class LocalCredentials extends Table {
  TextColumn get userId => text()();
  TextColumn get pinHash => text()(); // SHA-256 or bcrypt hash
  TextColumn get role => text()(); // 'superadmin' | 'admin' | 'driver'
  TextColumn get depositId => text().nullable()();
  TextColumn get userName => text()();
  DateTimeColumn get lastLoginAt => dateTime().nullable()();

  @override
  Set<Column> get primaryKey => {userId};
}

/// Auxiliary table tracking failed attempts and 60s lockout
@DataClassName('LocalAttemptRow')
class LocalAttempts extends Table {
  TextColumn get key => text()(); // 'global' or userId
  IntColumn get failedAttempts => integer().withDefault(const Constant(0))();
  DateTimeColumn get lockoutUntil => dateTime().nullable()();
  DateTimeColumn get lastAttemptAt => dateTime()();

  @override
  Set<Column> get primaryKey => {key};
}

/// Auxiliary table for sync cursors and timestamps
@DataClassName('SyncStateRow')
class SyncStates extends Table {
  TextColumn get collection => text()();
  DateTimeColumn get lastServerUpdatedAt => dateTime()();
  TextColumn get lastDocId => text().withDefault(const Constant(''))();

  @override
  Set<Column> get primaryKey => {collection};
}

@DriftDatabase(tables: [Documents, LocalCredentials, LocalAttempts, SyncStates])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  static QueryExecutor _openConnection() {
    return driftDatabase(name: 'eseka_distribution_drift.sqlite');
  }
}

/// LocalDataService facade: Single entry point to Drift database
class LocalDataService {
  final AppDatabase db;

  LocalDataService(this.db);

  /// Create a new document locally (marks dirty=true, version=1)
  Future<void> createDocument({
    required String collection,
    required String docId,
    required Map<String, dynamic> data,
    String? depositId,
  }) async {
    final now = DateTime.now().toUtc();
    final row = DocumentsCompanion.insert(
      collection: collection,
      docId: docId,
      depositId: Value(depositId),
      payload: jsonEncode(data),
      version: const Value(1),
      localUpdatedAt: now,
      dirty: const Value(true),
      deleted: const Value(false),
    );
    await db.into(db.documents).insertOnConflictUpdate(row);
  }

  /// Update existing document: Merges payload, increments version monotonically, dirty=true
  Future<void> updateDocument({
    required String collection,
    required String docId,
    required Map<String, dynamic> partialData,
  }) async {
    await db.transaction(() async {
      final existing = await (db.select(db.documents)
            ..where((tbl) => tbl.collection.equals(collection) & tbl.docId.equals(docId)))
          .getSingleOrNull();

      final now = DateTime.now().toUtc();
      if (existing != null) {
        final currentPayload = jsonDecode(existing.payload) as Map<String, dynamic>;
        currentPayload.addAll(partialData);
        final newVersion = existing.version + 1;

        await (db.update(db.documents)
              ..where((tbl) => tbl.collection.equals(collection) & tbl.docId.equals(docId)))
            .write(
          DocumentsCompanion(
            payload: Value(jsonEncode(currentPayload)),
            version: Value(newVersion),
            localUpdatedAt: Value(now),
            dirty: const Value(true),
          ),
        );
      } else {
        await createDocument(
          collection: collection,
          docId: docId,
          data: partialData,
        );
      }
    });
  }

  /// Soft-delete document (tombstone pattern, dirty=true, version incremented)
  Future<void> deleteDocument({
    required String collection,
    required String docId,
  }) async {
    await db.transaction(() async {
      final existing = await (db.select(db.documents)
            ..where((tbl) => tbl.collection.equals(collection) & tbl.docId.equals(docId)))
          .getSingleOrNull();

      final now = DateTime.now().toUtc();
      if (existing != null) {
        await (db.update(db.documents)
              ..where((tbl) => tbl.collection.equals(collection) & tbl.docId.equals(docId)))
            .write(
          DocumentsCompanion(
            deleted: const Value(true),
            version: Value(existing.version + 1),
            localUpdatedAt: Value(now),
            dirty: const Value(true),
          ),
        );
      }
    });
  }

  /// Read single document
  Future<Map<String, dynamic>?> getDocument({
    required String collection,
    required String docId,
  }) async {
    final row = await (db.select(db.documents)
          ..where((tbl) =>
              tbl.collection.equals(collection) &
              tbl.docId.equals(docId) &
              tbl.deleted.equals(false)))
        .getSingleOrNull();

    if (row == null) return null;
    return jsonDecode(row.payload) as Map<String, dynamic>;
  }

  /// Query multiple documents with strict multi-tenancy DepotScope filtering
  Future<List<Map<String, dynamic>>> getDocuments({
    required String collection,
    required DepotScope scope,
  }) async {
    final query = db.select(db.documents)
      ..where((tbl) => tbl.collection.equals(collection) & tbl.deleted.equals(false));

    final rows = await query.get();
    return rows
        .where((r) => scope.matches(r.depositId))
        .map((r) => jsonDecode(r.payload) as Map<String, dynamic>)
        .toList();
  }

  /// Reactive stream of documents for Riverpod StreamProvider
  Stream<List<Map<String, dynamic>>> watchDocuments({
    required String collection,
    required DepotScope scope,
  }) {
    final query = db.select(db.documents)
      ..where((tbl) => tbl.collection.equals(collection) & tbl.deleted.equals(false));

    return query.watch().map((rows) => rows
        .where((r) => scope.matches(r.depositId))
        .map((r) => jsonDecode(r.payload) as Map<String, dynamic>)
        .toList());
  }

  /// Transactional batch write
  Future<void> batchWrite(Future<void> Function() action) async {
    await db.transaction(action);
  }

  /// Get pending dirty rows to send to Supabase
  Future<List<DocumentRow>> getDirtyRows() async {
    return (db.select(db.documents)..where((tbl) => tbl.dirty.equals(true))).get();
  }

  /// Mark synced rows as clean
  Future<void> markRowsClean(List<DocumentRow> rows) async {
    await db.transaction(() async {
      for (final r in rows) {
        await (db.update(db.documents)
              ..where((tbl) => tbl.collection.equals(r.collection) & tbl.docId.equals(r.docId)))
            .write(const DocumentsCompanion(dirty: Value(false)));
      }
    });
  }
}
