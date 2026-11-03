import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/auth/pin_auth_service.dart';
import '../core/database/database.dart';
import '../core/sync/sync_service.dart';
import '../models/models.dart';

// Database & Core Services Providers
final appDatabaseProvider = Provider<AppDatabase>((ref) {
  return AppDatabase();
});

final localDataServiceProvider = Provider<LocalDataService>((ref) {
  final db = ref.watch(appDatabaseProvider);
  return LocalDataService(db);
});

final pinAuthServiceProvider = Provider<PinAuthService>((ref) {
  final db = ref.watch(appDatabaseProvider);
  return PinAuthService(db);
});

final syncServiceProvider = Provider<SyncService>((ref) {
  final localService = ref.watch(localDataServiceProvider);
  final supabase = Supabase.instance.client;
  final connectivity = Connectivity();

  final service = SyncService(
    localService: localService,
    supabase: supabase,
    connectivity: connectivity,
  );

  ref.onDispose(() => service.dispose());
  return service;
});

final syncStatsStreamProvider = StreamProvider<SyncStats>((ref) {
  final syncService = ref.watch(syncServiceProvider);
  return syncService.syncStatsStream;
});

// Authentication State
class AuthStateNotifier extends StateNotifier<AuthUser?> {
  final PinAuthService _authService;
  final SyncService _syncService;

  AuthStateNotifier(this._authService, this._syncService) : super(null) {
    _initDefaultAccounts();
  }

  Future<void> _initDefaultAccounts() async {
    await _authService.seedDefaultCredentials();
  }

  Future<AuthResult> loginWithPin(String pin, {String? userId}) async {
    final result = await _authService.authenticateWithPin(pin, targetUserId: userId);
    if (result.success && result.user != null) {
      state = result.user;
      // Trigger background sync for this user's depot
      _syncService.syncNow(currentDepotId: result.user!.depositId);
    }
    return result;
  }

  void logout() {
    state = null;
  }
}

final currentUserProvider = StateNotifierProvider<AuthStateNotifier, AuthUser?>((ref) {
  final authService = ref.watch(pinAuthServiceProvider);
  final syncService = ref.watch(syncServiceProvider);
  return AuthStateNotifier(authService, syncService);
});

// Multi-tenancy DepotScope Provider
final currentDepotScopeProvider = Provider<DepotScope>((ref) {
  final user = ref.watch(currentUserProvider);
  if (user == null) return const DepotScope.none();
  if (user.isSuperAdmin) return const DepotScope.all();
  if (user.depositId != null) return DepotScope.deposit(user.depositId!);
  return const DepotScope.none();
});

// Products Stream Provider
final productsStreamProvider = StreamProvider<List<Product>>((ref) {
  final localService = ref.watch(localDataServiceProvider);
  final scope = ref.watch(currentDepotScopeProvider);

  return localService
      .watchDocuments(collection: 'products', scope: scope)
      .map((list) => list.map((json) => Product.fromJson(json)).toList());
});

// Orders Stream Provider
final ordersStreamProvider = StreamProvider<List<Order>>((ref) {
  final localService = ref.watch(localDataServiceProvider);
  final scope = ref.watch(currentDepotScopeProvider);

  return localService
      .watchDocuments(collection: 'orders', scope: scope)
      .map((list) => list.map((json) => Order.fromJson(json)).toList());
});

// Tours Stream Provider
final toursStreamProvider = StreamProvider<List<Tour>>((ref) {
  final localService = ref.watch(localDataServiceProvider);
  final scope = ref.watch(currentDepotScopeProvider);

  return localService
      .watchDocuments(collection: 'tours', scope: scope)
      .map((list) => list.map((json) => Tour.fromJson(json)).toList());
});

// Active Driver Tour Controller
class ActiveTourNotifier extends StateNotifier<Tour?> {
  final LocalDataService _localService;
  final SyncService _syncService;

  ActiveTourNotifier(this._localService, this._syncService) : super(null);

  void setActiveTour(Tour tour) {
    state = tour;
  }

  /// Update a stop delivery status, empties collected, and payment
  Future<void> updateDeliveryStop({
    required int stopOrder,
    required DeliveryResultStatus status,
    required int deliveredCrates,
    required int emptyCratesCollected,
    PaymentMethod? paymentMethod,
    required int amountCollected,
    String? mobileMoneyTxRef,
    String? failureReason,
  }) async {
    if (state == null) return;

    final updatedStops = state!.stops.map((stop) {
      if (stop.stopOrder == stopOrder) {
        return stop.copyWith(
          status: status,
          deliveredCrates: deliveredCrates,
          emptyCratesCollected: emptyCratesCollected,
          paymentMethod: paymentMethod,
          amountCollected: amountCollected,
          mobileMoneyTxRef: mobileMoneyTxRef,
          failureReason: failureReason,
          completedAt: DateTime.now(),
        );
      }
      return stop;
    }).toList();

    final updatedTour = Tour(
      id: state!.id,
      tourNumber: state!.tourNumber,
      depositId: state!.depositId,
      driverId: state!.driverId,
      driverName: state!.driverName,
      vehicleId: state!.vehicleId,
      vehicleName: state!.vehicleName,
      vehicleType: state!.vehicleType,
      stops: updatedStops,
      status: state!.status,
      totalLoadedCrates: state!.totalLoadedCrates,
      startedAt: state!.startedAt,
      closedAt: state!.closedAt,
      reconciliation: state!.reconciliation,
    );

    state = updatedTour;

    // Persist to local Drift SQLite (100% offline first, marks dirty=true)
    await _localService.updateDocument(
      collection: 'tours',
      docId: updatedTour.id,
      partialData: updatedTour.toJson(),
    );

    // Notify debounced sync engine
    _syncService.notifyLocalWrite();
  }

  /// Reconcile and close tour
  Future<void> reconcileAndClose({
    required CashierReconciliation reconciliation,
  }) async {
    if (state == null) return;

    final closedTour = Tour(
      id: state!.id,
      tourNumber: state!.tourNumber,
      depositId: state!.depositId,
      driverId: state!.driverId,
      driverName: state!.driverName,
      vehicleId: state!.vehicleId,
      vehicleName: state!.vehicleName,
      vehicleType: state!.vehicleType,
      stops: state!.stops,
      status: TourStatus.reconciled,
      totalLoadedCrates: state!.totalLoadedCrates,
      startedAt: state!.startedAt,
      closedAt: DateTime.now(),
      reconciliation: reconciliation,
    );

    state = closedTour;

    await _localService.updateDocument(
      collection: 'tours',
      docId: closedTour.id,
      partialData: closedTour.toJson(),
    );

    _syncService.notifyLocalWrite();
  }
}

final activeTourProvider = StateNotifierProvider<ActiveTourNotifier, Tour?>((ref) {
  final localService = ref.watch(localDataServiceProvider);
  final syncService = ref.watch(syncServiceProvider);
  return ActiveTourNotifier(localService, syncService);
});

// Daily Depot Dashboard Metrics Provider
class DepotMetrics {
  final int totalSalesXaf;
  final int totalDeliveredCrates;
  final int totalEmptiesReturned;
  final int totalCashCollected;
  final int totalMomoCollected;
  final int totalOrangeMoneyCollected;
  final int totalToursCompleted;

  const DepotMetrics({
    this.totalSalesXaf = 0,
    this.totalDeliveredCrates = 0,
    this.totalEmptiesReturned = 0,
    this.totalCashCollected = 0,
    this.totalMomoCollected = 0,
    this.totalOrangeMoneyCollected = 0,
    this.totalToursCompleted = 0,
  });
}

final depotKpiProvider = Provider<DepotMetrics>((ref) {
  final toursAsync = ref.watch(toursStreamProvider);

  return toursAsync.when(
    data: (tours) {
      int sales = 0;
      int deliveredCrates = 0;
      int emptiesReturned = 0;
      int cash = 0;
      int momo = 0;
      int om = 0;
      int completedTours = 0;

      for (final t in tours) {
        if (t.status == TourStatus.reconciled || t.status == TourStatus.closed) {
          completedTours++;
        }
        for (final s in t.stops) {
          sales += s.amountCollected;
          deliveredCrates += s.deliveredCrates;
          emptiesReturned += s.emptyCratesCollected;
          if (s.paymentMethod == PaymentMethod.cash) cash += s.amountCollected;
          if (s.paymentMethod == PaymentMethod.mtnMomo) momo += s.amountCollected;
          if (s.paymentMethod == PaymentMethod.orangeMoney) om += s.amountCollected;
        }
      }

      return DepotMetrics(
        totalSalesXaf: sales,
        totalDeliveredCrates: deliveredCrates,
        totalEmptiesReturned: emptiesReturned,
        totalCashCollected: cash,
        totalMomoCollected: momo,
        totalOrangeMoneyCollected: om,
        totalToursCompleted: completedTours,
      );
    },
    loading: () => const DepotMetrics(),
    error: (_, __) => const DepotMetrics(),
  );
});
