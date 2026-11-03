import 'dart:async';
import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:drift/drift.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../database/database.dart';

enum SyncStatus { idle, syncing, offline, error, success }

class SyncStats {
  final int pendingDirtyCount;
  final DateTime? lastSuccessfulSync;
  final String? lastError;
  final SyncStatus status;

  const SyncStats({
    this.pendingDirtyCount = 0,
    this.lastSuccessfulSync,
    this.lastError,
    this.status = SyncStatus.idle,
  });

  SyncStats copyWith({
    int? pendingDirtyCount,
    DateTime? lastSuccessfulSync,
    String? lastError,
    SyncStatus? status,
  }) {
    return SyncStats(
      pendingDirtyCount: pendingDirtyCount ?? this.pendingDirtyCount,
      lastSuccessfulSync: lastSuccessfulSync ?? this.lastSuccessfulSync,
      lastError: lastError ?? this.lastError,
      status: status ?? this.status,
    );
  }
}

/// Synchronization Engine (Push/Pull, Keyset Cursors, LWW Conflict Resolution)
class SyncService {
  final LocalDataService localService;
  final SupabaseClient supabase;
  final Connectivity connectivity;

  final _syncStatsController = StreamController<SyncStats>.broadcast();
  Stream<SyncStats> get syncStatsStream => _syncStatsController.stream;

  SyncStats _currentStats = const SyncStats();
  SyncStats get currentStats => _currentStats;

  Timer? _debounceTimer;
  Timer? _periodicTimer;
  StreamSubscription? _connectivitySubscription;
  bool _isSyncing = false;

  SyncService({
    required this.localService,
    required this.supabase,
    required this.connectivity,
  }) {
    _initTriggers();
  }

  void _initTriggers() {
    // 1. Connectivity change trigger
    _connectivitySubscription = connectivity.onConnectivityChanged.listen((results) {
      final isOnline = results.any((r) => r != ConnectivityResult.none);
      if (isOnline) {
        syncNow(reason: 'Network recovered');
      } else {
        _updateStats(_currentStats.copyWith(status: SyncStatus.offline));
      }
    });

    // 2. Periodic background poll (every 5 minutes)
    _periodicTimer = Timer.periodic(const Duration(minutes: 5), (_) {
      syncNow(reason: 'Periodic polling');
    });

    // Initial check
    _checkPendingCount();
  }

  void _updateStats(SyncStats newStats) {
    _currentStats = newStats;
    _syncStatsController.add(newStats);
  }

  Future<void> _checkPendingCount() async {
    final dirty = await localService.getDirtyRows();
    _updateStats(_currentStats.copyWith(pendingDirtyCount: dirty.length));
  }

  /// Debounced local write trigger (called after every local DB change)
  void notifyLocalWrite() {
    _checkPendingCount();
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(seconds: 3), () {
      syncNow(reason: 'Debounced local write');
    });
  }

  /// Full bidirectional synchronization cycle (Push dirty rows, then Pull server updates)
  Future<void> syncNow({String reason = 'manual', String? currentDepotId}) async {
    if (_isSyncing) return;

    // Check connectivity first (non-blocking offline-first)
    final connection = await connectivity.checkConnectivity();
    final isOnline = connection.any((r) => r != ConnectivityResult.none);
    if (!isOnline) {
      _updateStats(_currentStats.copyWith(status: SyncStatus.offline));
      return;
    }

    _isSyncing = true;
    _updateStats(_currentStats.copyWith(status: SyncStatus.syncing, lastError: null));

    try {
      // Step 1: PUSH DIRTY ROWS
      await _pushDirtyRows(currentDepotId);

      // Step 2: PULL REMOTE UPDATES WITH KEYSET CURSOR
      await _pullRemoteRows(currentDepotId);

      final dirtyRemaining = await localService.getDirtyRows();
      _updateStats(_currentStats.copyWith(
        status: SyncStatus.success,
        pendingDirtyCount: dirtyRemaining.length,
        lastSuccessfulSync: DateTime.now(),
      ));
    } catch (e) {
      // Non-blocking: record error but leave application completely usable offline
      _updateStats(_currentStats.copyWith(
        status: SyncStatus.error,
        lastError: e.toString(),
      ));
    } finally {
      _isSyncing = false;
    }
  }

  /// PUSH dirty rows to Supabase RPC 'sync_push_rows'
  Future<void> _pushDirtyRows(String? depotId) async {
    final dirtyRows = await localService.getDirtyRows();
    if (dirtyRows.isEmpty) return;

    // Prepare JSON payload for RPC
    final rowsPayload = dirtyRows.map((r) => {
      'collection': r.collection,
      'doc_id': r.docId,
      'deposit_id': r.depositId,
      'payload': jsonDecode(r.payload),
      'version': r.version,
      'deleted': r.deleted,
    }).toList();

    final response = await supabase.rpc('sync_push_rows', params: {
      'p_rows': rowsPayload,
      'p_client_deposit_id': depotId ?? 'depot_eseka_centre',
    });

    if (response != null && response['success'] == true) {
      // Successfully accepted on server: mark these rows as clean in Drift
      await localService.markRowsClean(dirtyRows);
    }
  }

  /// PULL remote updates using keyset cursor pagination on (server_updated_at, doc_id)
  Future<void> _pullRemoteRows(String? depotId) async {
    final collections = ['products', 'vehicles', 'customers', 'orders', 'tours'];

    for (final col in collections) {
      // Retrieve current cursor from Drift
      final syncState = await (localService.db.select(localService.db.syncStates)
            ..where((tbl) => tbl.collection.equals(col)))
          .getSingleOrNull();

      final cursorTime = syncState?.lastServerUpdatedAt ?? DateTime.fromMillisecondsSinceEpoch(0, isUtc: true);
      final cursorDocId = syncState?.lastDocId ?? '';

      final List<dynamic> rows = await supabase.rpc('sync_pull_rows', params: {
        'p_collection': col,
        'p_deposit_id': depotId ?? 'all',
        'p_cursor_timestamp': cursorTime.toIso8601String(),
        'p_cursor_doc_id': cursorDocId,
        'p_limit': 100,
      });

      if (rows.isEmpty) continue;

      DateTime latestServerTimestamp = cursorTime;
      String latestDocId = cursorDocId;

      await localService.batchWrite(() async {
        for (final item in rows) {
          final serverCol = item['collection'] as String;
          final serverDocId = item['doc_id'] as String;
          final serverPayload = item['payload'] as Map<String, dynamic>;
          final serverVersion = item['version'] as int;
          final serverDeleted = item['deleted'] as bool;
          final serverUpdatedAt = DateTime.parse(item['server_updated_at'] as String);

          // Last-Write-Wins (LWW) evaluation against local record
          final existing = await (localService.db.select(localService.db.documents)
                ..where((t) => t.collection.equals(serverCol) & t.docId.equals(serverDocId)))
              .getSingleOrNull();

          if (existing == null) {
            // New remote record
            await localService.db.into(localService.db.documents).insert(
              DocumentsCompanion.insert(
                collection: serverCol,
                docId: serverDocId,
                depositId: Value(item['deposit_id'] as String?),
                payload: jsonEncode(serverPayload),
                version: Value(serverVersion),
                localUpdatedAt: serverUpdatedAt,
                dirty: const Value(false),
                deleted: Value(serverDeleted),
              ),
            );
          } else if (serverVersion > existing.version) {
            // Remote version wins
            await (localService.db.update(localService.db.documents)
                  ..where((t) => t.collection.equals(serverCol) & t.docId.equals(serverDocId)))
                .write(
              DocumentsCompanion(
                payload: Value(jsonEncode(serverPayload)),
                version: Value(serverVersion),
                deleted: Value(serverDeleted),
                dirty: const Value(false),
                localUpdatedAt: Value(serverUpdatedAt),
              ),
            );
          }
          // If existing.version > serverVersion, local wins (LWW) and remains dirty until next push

          if (serverUpdatedAt.isAfter(latestServerTimestamp)) {
            latestServerTimestamp = serverUpdatedAt;
            latestDocId = serverDocId;
          }
        }

        // Update cursor in Drift
        await localService.db.into(localService.db.syncStates).insertOnConflictUpdate(
          SyncStatesCompanion.insert(
            collection: col,
            lastServerUpdatedAt: latestServerTimestamp,
            lastDocId: Value(latestDocId),
          ),
        );
      });
    }
  }

  void dispose() {
    _debounceTimer?.cancel();
    _periodicTimer?.cancel();
    _connectivitySubscription?.cancel();
    _syncStatsController.close();
  }
}
