import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:uuid/uuid.dart';
import '../../models/models.dart';
import '../../providers/app_providers.dart';

class TourPlanningScreen extends ConsumerStatefulWidget {
  const TourPlanningScreen({super.key});

  @override
  ConsumerState<TourPlanningScreen> createState() => _TourPlanningScreenState();
}

class _TourPlanningScreenState extends ConsumerState<TourPlanningScreen> {
  final _currencyFormat = NumberFormat.currency(locale: 'fr_CM', symbol: 'FCFA', decimalDigits: 0);

  // Available vehicles in Eséka
  final List<Map<String, dynamic>> _vehicles = [
    {
      'id': 'veh_camion_5t',
      'name': 'Camion 5T Mercedes Benz',
      'type': VehicleType.truck5T,
      'plate': 'LT 894 AB',
      'capacity': 280,
    },
    {
      'id': 'veh_pickup_hilux',
      'name': 'Pickup Toyota Hilux 4x4',
      'type': VehicleType.pickup,
      'plate': 'CE 412 HK',
      'capacity': 90,
    },
    {
      'id': 'veh_tricycle_tvs',
      'name': 'Tricycle TVS King Cargo',
      'type': VehicleType.tricycle,
      'plate': 'ESK-TRI-02',
      'capacity': 40,
    },
  ];

  // Available drivers
  final List<Map<String, String>> _drivers = [
    {'id': 'user_driver_paul', 'name': 'Paul Mvondo (Chauffeur Poids Lourd)'},
    {'id': 'user_driver_alain', 'name': 'Alain Mbida (Chauffeur Pickup)'},
    {'id': 'user_driver_jean', 'name': 'Jean Bikoi (Chauffeur Tricycle)'},
  ];

  // Pending candidate stops to include
  late List<DeliveryStop> _stops;
  Map<String, dynamic>? _selectedVehicle;
  Map<String, String>? _selectedDriver;

  @override
  void initState() {
    super.initState();
    _selectedVehicle = _vehicles[1]; // Pickup default
    _selectedDriver = _drivers[0];

    _stops = [
      const DeliveryStop(
        stopOrder: 1,
        orderId: 'ord_demo_01',
        customerName: 'Bar Le Boukarou Eséka',
        customerPhone: '+237 677 12 34 56',
        quarter: 'Quartier Gare',
        expectedCrates: 25,
        expectedAmount: 200000,
      ),
      const DeliveryStop(
        stopOrder: 2,
        orderId: 'ord_demo_02',
        customerName: 'Cave Le Palmier Royal',
        customerPhone: '+237 699 98 76 54',
        quarter: 'Marché Central',
        expectedCrates: 18,
        expectedAmount: 156600,
      ),
      const DeliveryStop(
        stopOrder: 3,
        orderId: 'ord_demo_03',
        customerName: 'Boutique Snack L\'Oasis',
        customerPhone: '+237 655 44 33 22',
        quarter: 'Carrefour Hôpital',
        expectedCrates: 12,
        expectedAmount: 96000,
      ),
    ];
  }

  int get totalCrates => _stops.fold(0, (sum, s) => sum + s.expectedCrates);
  int get totalAmount => _stops.fold(0, (sum, s) => sum + s.expectedAmount);
  int get vehicleCapacity => (_selectedVehicle?['capacity'] as int?) ?? 100;
  bool get isOverloaded => totalCrates > vehicleCapacity;

  void _reorderStop(int oldIndex, int newIndex) {
    setState(() {
      if (oldIndex < newIndex) {
        newIndex -= 1;
      }
      final item = _stops.removeAt(oldIndex);
      _stops.insert(newIndex, item);
      // Re-index stops 1, 2, 3
      _stops = [
        for (int i = 0; i < _stops.length; i++)
          DeliveryStop(
            stopOrder: i + 1,
            orderId: _stops[i].orderId,
            customerName: _stops[i].customerName,
            customerPhone: _stops[i].customerPhone,
            quarter: _stops[i].quarter,
            expectedCrates: _stops[i].expectedCrates,
            expectedAmount: _stops[i].expectedAmount,
          ),
      ];
    });
  }

  Future<void> _createTour() async {
    if (isOverloaded) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: Colors.red[700],
          content: Text('Surcharge ! Le véhicule ne peut charger que $vehicleCapacity casiers.'),
        ),
      );
      return;
    }

    final tourId = 'tour_${const Uuid().v4().substring(0, 8)}';
    final user = ref.read(currentUserProvider);

    final tour = Tour(
      id: tourId,
      tourNumber: 'TR-${DateTime.now().year}-ESK-${_stops.length}',
      depositId: user?.depositId ?? 'depot_eseka_centre',
      driverId: _selectedDriver!['id']!,
      driverName: _selectedDriver!['name']!,
      vehicleId: _selectedVehicle!['id'] as String,
      vehicleName: _selectedVehicle!['name'] as String,
      vehicleType: _selectedVehicle!['type'] as VehicleType,
      stops: _stops,
      status: TourStatus.inProgress,
      totalLoadedCrates: totalCrates,
      startedAt: DateTime.now(),
    );

    // Save locally into Drift SQLite
    final localService = ref.read(localDataServiceProvider);
    await localService.createDocument(
      collection: 'tours',
      docId: tour.id,
      depositId: tour.depositId,
      data: tour.toJson(),
    );

    // Set as active tour for immediate testing
    ref.read(activeTourProvider.notifier).setActiveTour(tour);
    ref.read(syncServiceProvider).notifyLocalWrite();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF0F766E),
          content: Text('Tournée créée avec succès : ${tour.tourNumber} (${totalCrates} casiers)'),
        ),
      );
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Planification de Tournée'),
        actions: [
          IconButton(
            icon: const Icon(Icons.check_circle_rounded),
            tooltip: 'Lancer Tournée',
            onPressed: isOverloaded ? null : _createTour,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Vehicle & Capacity Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('1. Choix du Véhicule', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<Map<String, dynamic>>(
                    value: _selectedVehicle,
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: const Color(0xFFF1F5F9),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                    ),
                    items: _vehicles.map((v) {
                      return DropdownMenuItem(
                        value: v,
                        child: Text('${v['name']} (${v['capacity']} casiers)'),
                      );
                    }).toList(),
                    onChanged: (val) => setState(() => _selectedVehicle = val),
                  ),
                  const SizedBox(height: 12),
                  // Gauge / Progress indicator
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Chargement prévisionnel: $totalCrates / $vehicleCapacity casiers',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: isOverloaded ? Colors.red : const Color(0xFF475569))),
                      Text('${((totalCrates / vehicleCapacity) * 100).toStringAsFixed(0)}%',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: isOverloaded ? Colors.red : const Color(0xFF0F766E))),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: (totalCrates / vehicleCapacity).clamp(0.0, 1.0),
                      backgroundColor: const Color(0xFFE2E8F0),
                      color: isOverloaded ? Colors.red : const Color(0xFF0F766E),
                      minHeight: 8,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Driver Selector
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('2. Affectation du Chauffeur', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<Map<String, String>>(
                    value: _selectedDriver,
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: const Color(0xFFF1F5F9),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                    ),
                    items: _drivers.map((d) {
                      return DropdownMenuItem(
                        value: d,
                        child: Text(d['name']!),
                      );
                    }).toList(),
                    onChanged: (val) => setState(() => _selectedDriver = val),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Route Map & Sequenced Stops
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  '3. Ordre de la Tournée (Glisser pour ordonner)',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E293B)),
                ),
                Text('${_stops.length} arrêts', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              ],
            ),
            const SizedBox(height: 8),

            ReorderableListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _stops.length,
              onReorder: _reorderStop,
              itemBuilder: (context, index) {
                final stop = _stops[index];
                return Container(
                  key: ValueKey(stop.orderId),
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: const Color(0xFFD97706),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '${stop.stopOrder}',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(stop.customerName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                            Text('${stop.quarter} · ${stop.customerPhone}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('${stop.expectedCrates} casiers', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFFD97706))),
                          Text(_currencyFormat.format(stop.expectedAmount), style: const TextStyle(fontSize: 11, color: Color(0xFF475569))),
                        ],
                      ),
                      const SizedBox(width: 8),
                      const Icon(Icons.drag_indicator, color: Color(0xFF94A3B8)),
                    ],
                  ),
                );
              },
            ),

            const SizedBox(height: 24),

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFD97706),
                  foregroundColor: Colors.white,
                  shape: BorderRadius.circular(12),
                ),
                icon: const Icon(Icons.local_shipping_rounded),
                label: Text(
                  'Valider & Démarrer la Tournée (${totalCrates} casiers)',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                onPressed: isOverloaded ? null : _createTour,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
