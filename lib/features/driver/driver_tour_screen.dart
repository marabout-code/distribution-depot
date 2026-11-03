import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../models/models.dart';
import '../../providers/app_providers.dart';

class DriverTourScreen extends ConsumerStatefulWidget {
  const DriverTourScreen({super.key});

  @override
  ConsumerState<DriverTourScreen> createState() => _DriverTourScreenState();
}

class _DriverTourScreenState extends ConsumerState<DriverTourScreen> {
  final _currencyFormat = NumberFormat.currency(locale: 'fr_CM', symbol: 'FCFA', decimalDigits: 0);
  int _activeStopIndex = 0;

  // Selected stop edit state
  DeliveryResultStatus _deliveryStatus = DeliveryResultStatus.delivered100;
  int _deliveredCrates = 0;
  int _emptiesCollected = 0;
  PaymentMethod _paymentMethod = PaymentMethod.cash;
  int _amountCollected = 0;
  final _txRefController = TextEditingController();
  final _failureReasonController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initDemoTourIfEmpty();
    });
  }

  void _initDemoTourIfEmpty() {
    final activeTour = ref.read(activeTourProvider);
    if (activeTour == null) {
      // Seed an active demo tour for Eséka
      final user = ref.read(currentUserProvider);
      final demoTour = Tour(
        id: 'tour_esk_active',
        tourNumber: 'TR-2024-ESK-01',
        depositId: user?.depositId ?? 'depot_eseka_centre',
        driverId: user?.userId ?? 'user_driver_paul',
        driverName: user?.userName ?? 'Paul Mvondo',
        vehicleId: 'veh_pickup_hilux',
        vehicleName: 'Pickup Toyota Hilux 4x4 (CE 412 HK)',
        vehicleType: VehicleType.pickup,
        status: TourStatus.inProgress,
        totalLoadedCrates: 55,
        startedAt: DateTime.now().subtract(const Duration(hours: 2)),
        stops: [
          const DeliveryStop(
            stopOrder: 1,
            orderId: 'ord_demo_01',
            customerName: 'Bar Le Boukarou Eséka',
            customerPhone: '+237 677 12 34 56',
            quarter: 'Quartier Gare',
            expectedCrates: 25,
            expectedAmount: 200000,
            status: DeliveryResultStatus.pending,
          ),
          const DeliveryStop(
            stopOrder: 2,
            orderId: 'ord_demo_02',
            customerName: 'Cave Le Palmier Royal',
            customerPhone: '+237 699 98 76 54',
            quarter: 'Marché Central',
            expectedCrates: 18,
            expectedAmount: 144000,
            status: DeliveryResultStatus.pending,
          ),
          const DeliveryStop(
            stopOrder: 3,
            orderId: 'ord_demo_03',
            customerName: 'Boutique Snack L\'Oasis',
            customerPhone: '+237 655 44 33 22',
            quarter: 'Carrefour Hôpital',
            expectedCrates: 12,
            expectedAmount: 96000,
            status: DeliveryResultStatus.pending,
          ),
        ],
      );
      ref.read(activeTourProvider.notifier).setActiveTour(demoTour);
      _prepareStop(demoTour.stops.first);
    } else {
      _prepareStop(activeTour.stops[_activeStopIndex.clamp(0, activeTour.stops.length - 1)]);
    }
  }

  void _prepareStop(DeliveryStop stop) {
    setState(() {
      _deliveredCrates = stop.deliveredCrates > 0 ? stop.deliveredCrates : stop.expectedCrates;
      _emptiesCollected = stop.emptyCratesCollected > 0 ? stop.emptyCratesCollected : stop.expectedCrates;
      _amountCollected = stop.amountCollected > 0 ? stop.amountCollected : stop.expectedAmount;
      _deliveryStatus = stop.status == DeliveryResultStatus.pending ? DeliveryResultStatus.delivered100 : stop.status;
      _paymentMethod = stop.paymentMethod ?? PaymentMethod.cash;
      _txRefController.text = stop.mobileMoneyTxRef ?? '';
      _failureReasonController.text = stop.failureReason ?? '';
    });
  }

  Future<void> _recordStopDelivery(Tour tour, DeliveryStop stop) async {
    final notifier = ref.read(activeTourProvider.notifier);

    await notifier.updateDeliveryStop(
      stopOrder: stop.stopOrder,
      status: _deliveryStatus,
      deliveredCrates: _deliveryStatus == DeliveryResultStatus.failed ? 0 : _deliveredCrates,
      emptyCratesCollected: _emptiesCollected,
      paymentMethod: _deliveryStatus == DeliveryResultStatus.failed ? null : _paymentMethod,
      amountCollected: _deliveryStatus == DeliveryResultStatus.failed ? 0 : _amountCollected,
      mobileMoneyTxRef: _txRefController.text.isNotEmpty ? _txRefController.text : null,
      failureReason: _deliveryStatus == DeliveryResultStatus.failed ? _failureReasonController.text : null,
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF0F766E),
          content: Text('Arrêt ${stop.stopOrder} (${stop.customerName}) validé et sauvegardé hors-ligne.'),
        ),
      );

      // Move to next pending stop if available
      if (_activeStopIndex < tour.stops.length - 1) {
        setState(() {
          _activeStopIndex++;
          _prepareStop(tour.stops[_activeStopIndex]);
        });
      }
    }
  }

  void _showReconciliationDialog(Tour tour) {
    int cashTotal = 0;
    int momoTotal = 0;
    int omTotal = 0;
    int emptiesTotal = 0;
    int deliveredTotal = 0;

    for (final s in tour.stops) {
      deliveredTotal += s.deliveredCrates;
      emptiesTotal += s.emptyCratesCollected;
      if (s.paymentMethod == PaymentMethod.cash) cashTotal += s.amountCollected;
      if (s.paymentMethod == PaymentMethod.mtnMomo) momoTotal += s.amountCollected;
      if (s.paymentMethod == PaymentMethod.orangeMoney) omTotal += s.amountCollected;
    }

    final unsoldFullCrates = tour.totalLoadedCrates - deliveredTotal;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(color: Colors.slate[300], borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Réconciliation de Caisse & Fin de Tournée',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: Color(0xFF1E293B)),
              ),
              Text('Dépôt Eséka · Chauffeur: ${tour.driverName}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              const SizedBox(height: 16),

              // Breakdown Card
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    _buildReconRow('Espèces à remettre au caissier', _currencyFormat.format(cashTotal), isBold: true),
                    const SizedBox(height: 6),
                    _buildReconRow('Encaissements MTN MoMo (Dépôt)', _currencyFormat.format(momoTotal)),
                    const SizedBox(height: 6),
                    _buildReconRow('Encaissements Orange Money (Dépôt)', _currencyFormat.format(omTotal)),
                    const Divider(height: 16),
                    _buildReconRow('Casiers chargés au départ', '${tour.totalLoadedCrates} casiers'),
                    const SizedBox(height: 6),
                    _buildReconRow('Casiers pleins livrés', '$deliveredTotal casiers'),
                    const SizedBox(height: 6),
                    _buildReconRow('Casiers vides récupérés ramenés', '$emptiesTotal casiers', color: const Color(0xFF0F766E)),
                    const SizedBox(height: 6),
                    _buildReconRow('Casiers pleins invendus ramenés', '$unsoldFullCrates casiers', color: const Color(0xFFD97706)),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F766E),
                    foregroundColor: Colors.white,
                    shape: BorderRadius.circular(12),
                  ),
                  icon: const Icon(Icons.verified_user_rounded),
                  label: const Text('Valider Réconciliation & Clôturer', style: TextStyle(fontWeight: FontWeight.bold)),
                  onPressed: () async {
                    final user = ref.read(currentUserProvider);
                    final recon = CashierReconciliation(
                      totalCashHandedOver: cashTotal,
                      totalMtnMomo: momoTotal,
                      totalOrangeMoney: omTotal,
                      emptyCratesReturnedToDepot: emptiesTotal,
                      fullCratesReturnedUnsold: unsoldFullCrates,
                      cashDiscrepancy: 0,
                      cratesDiscrepancy: 0,
                      cashierUserId: user?.userId ?? 'admin_caisse',
                      cashierName: user?.userName ?? 'Caissier Dépôt Eséka',
                      reconciledAt: DateTime.now(),
                    );

                    await ref.read(activeTourProvider.notifier).reconcileAndClose(reconciliation: recon);
                    if (ctx.mounted) Navigator.pop(ctx);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          backgroundColor: Color(0xFF0F766E),
                          content: Text('Tournée clôturée et réconciliée avec succès en caisse !'),
                        ),
                      );
                    }
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildReconRow(String label, String value, {bool isBold = false, Color? color}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: 12, color: Colors.slate[700], fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
        Text(value, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color ?? (isBold ? const Color(0xFF1E293B) : Colors.slate[800]))),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final tour = ref.watch(activeTourProvider);
    final user = ref.watch(currentUserProvider);

    if (tour == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Tournée Chauffeur')),
        body: const Center(child: Text('Aucune tournée active assignée.')),
      );
    }

    final activeStop = tour.stops[_activeStopIndex.clamp(0, tour.stops.length - 1)];
    final completedCount = tour.stops.where((s) => s.status != DeliveryResultStatus.pending).length;

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: Text('Tournée ${tour.tourNumber}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.receipt_long_rounded),
            tooltip: 'Réconciliation & Clôture',
            onPressed: () => _showReconciliationDialog(tour),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Déconnexion',
            onPressed: () => ref.read(currentUserProvider.notifier).logout(),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Driver & Vehicle Status Strip
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              color: const Color(0xFF1E293B),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const CircleAvatar(
                        radius: 16,
                        backgroundColor: Color(0xFFD97706),
                        child: Icon(Icons.person, color: Colors.white, size: 18),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(user?.userName ?? tour.driverName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                          Text(tour.vehicleName, style: const TextStyle(color: Colors.white60, fontSize: 11)),
                        ],
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF334155),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      'Progression: $completedCount/${tour.stops.length}',
                      style: const TextStyle(color: Color(0xFFF59E0B), fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),

            // Horizontal Stops Bar (Thumb-friendly tab bar)
            Container(
              height: 56,
              color: Colors.white,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                itemCount: tour.stops.length,
                itemBuilder: (context, index) {
                  final stop = tour.stops[index];
                  final isSelected = index == _activeStopIndex;
                  final isDone = stop.status != DeliveryResultStatus.pending;

                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _activeStopIndex = index;
                        _prepareStop(stop);
                      });
                    },
                    child: Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFFD97706) : (isDone ? const Color(0xFFECFDF5) : const Color(0xFFF1F5F9)),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSelected ? const Color(0xFFB45309) : (isDone ? const Color(0xFFA7F3D0) : const Color(0xFFE2E8F0)),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            isDone ? Icons.check_circle : Icons.location_on,
                            size: 14,
                            color: isSelected ? Colors.white : (isDone ? const Color(0xFF059669) : const Color(0xFF64748B)),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Arrêt ${stop.stopOrder}: ${stop.customerName.split(" ").first}',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isSelected ? Colors.white : (isDone ? const Color(0xFF065F46) : const Color(0xFF334155)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            // Active Stop Delivery Card
            Padding(
              padding: const EdgeInsets.all(16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Stop Customer Header
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Arrêt n°${activeStop.stopOrder} · ${activeStop.customerName}',
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF0F172A)),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${activeStop.quarter} · Tél: ${activeStop.customerPhone}',
                                style: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '${activeStop.expectedCrates} casiers',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFFB45309)),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 16),
                    const Divider(height: 1, color: Color(0xFFE2E8F0)),
                    const SizedBox(height: 16),

                    // 1. Delivery Result Status (100% Livré / Partiel / Échec)
                    const Text('1. Résultat de la Livraison', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: _buildStatusRadio(
                            DeliveryResultStatus.delivered100,
                            '100% Livré',
                            const Color(0xFF10B981),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildStatusRadio(
                            DeliveryResultStatus.partial,
                            'Partiel',
                            const Color(0xFFF59E0B),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildStatusRadio(
                            DeliveryResultStatus.failed,
                            'Échec',
                            const Color(0xFFEF4444),
                          ),
                        ),
                      ],
                    ),

                    if (_deliveryStatus == DeliveryResultStatus.failed) ...[
                      const SizedBox(height: 12),
                      TextField(
                        controller: _failureReasonController,
                        decoration: InputDecoration(
                          labelText: 'Motif de l\'échec (Client absent, refus...)',
                          filled: true,
                          fillColor: const Color(0xFFFEF2F2),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ],

                    if (_deliveryStatus != DeliveryResultStatus.failed) ...[
                      const SizedBox(height: 16),

                      // 2. Quantities & Empties Recovered
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Casiers pleins remis', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.remove_circle_outline),
                                      onPressed: _deliveredCrates > 0 ? () => setState(() => _deliveredCrates--) : null,
                                    ),
                                    Text('$_deliveredCrates', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                                    IconButton(
                                      icon: const Icon(Icons.add_circle_outline),
                                      onPressed: () => setState(() => _deliveredCrates++),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Casiers vides récupérés', style: TextStyle(fontSize: 12, color: Color(0xFF0F766E), fontWeight: FontWeight.bold)),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.remove_circle_outline),
                                      onPressed: _emptiesCollected > 0 ? () => setState(() => _emptiesCollected--) : null,
                                    ),
                                    Text('$_emptiesCollected', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF0F766E))),
                                    IconButton(
                                      icon: const Icon(Icons.add_circle_outline),
                                      onPressed: () => setState(() => _emptiesCollected++),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 16),

                      // 3. Payment Mode & Amount (Cash, MTN MoMo, Orange Money)
                      const Text('2. Mode & Encaissement', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(child: _buildPaymentChip(PaymentMethod.cash, 'Espèces')),
                          const SizedBox(width: 6),
                          Expanded(child: _buildPaymentChip(PaymentMethod.mtnMomo, 'MTN MoMo')),
                          const SizedBox(width: 6),
                          Expanded(child: _buildPaymentChip(PaymentMethod.orangeMoney, 'Orange Money')),
                        ],
                      ),

                      const SizedBox(height: 12),

                      if (_paymentMethod != PaymentMethod.cash) ...[
                        TextField(
                          controller: _txRefController,
                          decoration: InputDecoration(
                            labelText: 'Réf. Transaction (${_paymentMethod.label})',
                            hintText: 'Ex: CM241102.1023.A481',
                            filled: true,
                            fillColor: const Color(0xFFF1F5F9),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],

                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Montant encaissé:', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          Text(
                            _currencyFormat.format(_amountCollected),
                            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: Color(0xFFD97706)),
                          ),
                        ],
                      ),
                    ],

                    const SizedBox(height: 24),

                    // Validate Stop Button
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFD97706),
                          foregroundColor: Colors.white,
                          shape: BorderRadius.circular(12),
                        ),
                        icon: const Icon(Icons.save_alt_rounded),
                        label: Text(
                          'Enregistrer la livraison Arrêt n°${activeStop.stopOrder}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        onPressed: () => _recordStopDelivery(tour, activeStop),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Bottom Reconcile CTA
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF0F766E),
                    side: const BorderSide(color: Color(0xFF0F766E)),
                    shape: BorderRadius.circular(12),
                  ),
                  icon: const Icon(Icons.point_of_sale_rounded),
                  label: const Text('Clôturer la Tournée & Réconciliation de Caisse'),
                  onPressed: () => _showReconciliationDialog(tour),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusRadio(DeliveryResultStatus status, String label, Color color) {
    final isSelected = _deliveryStatus == status;
    return InkWell(
      onTap: () => setState(() => _deliveryStatus = status),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.15) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isSelected ? color : const Color(0xFFCBD5E1), width: 1.5),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: isSelected ? color : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentChip(PaymentMethod method, String label) {
    final isSelected = _paymentMethod == method;
    return InkWell(
      onTap: () => setState(() => _paymentMethod = method),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(8),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }
}
