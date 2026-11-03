import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:drift/drift.dart';
import '../database/database.dart';

class AuthUser {
  final String userId;
  final String userName;
  final String role; // 'superadmin' | 'admin' | 'driver'
  final String? depositId;

  const AuthUser({
    required this.userId,
    required this.userName,
    required this.role,
    this.depositId,
  });

  bool get isSuperAdmin => role == 'superadmin';
  bool get isAdmin => role == 'admin' || role == 'superadmin';
  bool get isDriver => role == 'driver';
}

class AuthResult {
  final bool success;
  final AuthUser? user;
  final String? errorMessage;
  final int remainingAttempts;
  final int? lockoutSecondsRemaining;

  const AuthResult({
    required this.success,
    this.user,
    this.errorMessage,
    this.remainingAttempts = 3,
    this.lockoutSecondsRemaining,
  });
}

/// 100% Offline 4-digit PIN Authentication Service
class PinAuthService {
  final AppDatabase db;

  static const int maxFailedAttempts = 3;
  static const Duration lockoutDuration = Duration(seconds: 60);

  PinAuthService(this.db);

  /// Compute hash for 4-digit PIN (using SHA-256 with static salt)
  static String hashPin(String pin, {String salt = 'eseka_distribution_secure_salt'}) {
    final bytes = utf8.encode('$salt:$pin');
    return sha256.convert(bytes).toString();
  }

  /// Initialize default demo credentials in local_credentials table
  Future<void> seedDefaultCredentials() async {
    final existing = await db.select(db.localCredentials).get();
    if (existing.isNotEmpty) return;

    final users = [
      LocalCredentialsCompanion.insert(
        userId: 'user_superadmin',
        userName: 'M. Mbiang (Directeur Général)',
        role: 'superadmin',
        depositId: const Value(null),
        pinHash: hashPin('1111'),
      ),
      LocalCredentialsCompanion.insert(
        userId: 'user_admin_eseka',
        userName: 'Gérard Ondoa (Chef Dépôt Gare)',
        role: 'admin',
        depositId: const Value('depot_eseka_centre'),
        pinHash: hashPin('2222'),
      ),
      LocalCredentialsCompanion.insert(
        userId: 'user_driver_paul',
        userName: 'Paul Mvondo (Chauffeur Camion 5T)',
        role: 'driver',
        depositId: const Value('depot_eseka_centre'),
        pinHash: hashPin('3333'),
      ),
      LocalCredentialsCompanion.insert(
        userId: 'user_driver_jean',
        userName: 'Jean Bikoi (Chauffeur Tricycle)',
        role: 'driver',
        depositId: const Value('depot_eseka_centre'),
        pinHash: hashPin('4444'),
      ),
    ];

    for (final u in users) {
      await db.into(db.localCredentials).insertOnConflictUpdate(u);
    }
  }

  /// Verify 4-digit PIN against cached credentials with 3-attempt lockout
  Future<AuthResult> authenticateWithPin(String pin, {String? targetUserId}) async {
    final now = DateTime.now().toUtc();
    final attemptKey = targetUserId ?? 'global';

    // 1. Check existing lockout
    final attemptRecord = await (db.select(db.localAttempts)
          ..where((tbl) => tbl.key.equals(attemptKey)))
        .getSingleOrNull();

    if (attemptRecord != null && attemptRecord.lockoutUntil != null) {
      if (now.isBefore(attemptRecord.lockoutUntil!)) {
        final remainingSec = attemptRecord.lockoutUntil!.difference(now).inSeconds;
        return AuthResult(
          success: false,
          errorMessage: 'Compte verrouillé suite à 3 échecs. Réessayez dans ${remainingSec}s.',
          remainingAttempts: 0,
          lockoutSecondsRemaining: remainingSec,
        );
      } else {
        // Lockout expired, reset failed counter
        await (db.update(db.localAttempts)..where((tbl) => tbl.key.equals(attemptKey))).write(
          LocalAttemptsCompanion(
            failedAttempts: const Value(0),
            lockoutUntil: const Value(null),
            lastAttemptAt: Value(now),
          ),
        );
      }
    }

    // 2. Hash submitted PIN
    final computedHash = hashPin(pin);

    // 3. Match against cached credentials in Drift SQLite
    LocalCredentialRow? matchedUser;

    if (targetUserId != null) {
      matchedUser = await (db.select(db.localCredentials)
            ..where((tbl) => tbl.userId.equals(targetUserId) & tbl.pinHash.equals(computedHash)))
          .getSingleOrNull();
    } else {
      matchedUser = await (db.select(db.localCredentials)
            ..where((tbl) => tbl.pinHash.equals(computedHash)))
          .getSingleOrNull();
    }

    if (matchedUser != null) {
      // SUCCESS: Reset attempts and update lastLoginAt
      await (db.update(db.localAttempts)..where((tbl) => tbl.key.equals(attemptKey))).write(
        LocalAttemptsCompanion(
          failedAttempts: const Value(0),
          lockoutUntil: const Value(null),
          lastAttemptAt: Value(now),
        ),
      );

      await (db.update(db.localCredentials)
            ..where((tbl) => tbl.userId.equals(matchedUser!.userId)))
          .write(LocalCredentialsCompanion(lastLoginAt: Value(now)));

      return AuthResult(
        success: true,
        user: AuthUser(
          userId: matchedUser.userId,
          userName: matchedUser.userName,
          role: matchedUser.role,
          depositId: matchedUser.depositId,
        ),
      );
    } else {
      // FAILURE: Increment failed attempts counter
      final currentFails = (attemptRecord?.failedAttempts ?? 0) + 1;
      final isLocked = currentFails >= maxFailedAttempts;
      final lockoutTime = isLocked ? now.add(lockoutDuration) : null;

      await db.into(db.localAttempts).insertOnConflictUpdate(
        LocalAttemptsCompanion.insert(
          key: attemptKey,
          failedAttempts: Value(currentFails),
          lockoutUntil: Value(lockoutTime),
          lastAttemptAt: now,
        ),
      );

      final remaining = (maxFailedAttempts - currentFails).clamp(0, maxFailedAttempts);

      return AuthResult(
        success: false,
        errorMessage: isLocked
            ? '3 échecs consécutifs ! Application verrouillée pendant 60 secondes.'
            : 'Code PIN invalide. Tentatives restantes: $remaining.',
        remainingAttempts: remaining,
        lockoutSecondsRemaining: isLocked ? 60 : null,
      );
    }
  }
}
