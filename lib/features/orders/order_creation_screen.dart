import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:uuid/uuid.dart';
import '../../models/models.dart';
import '../../providers/app_providers.dart';

class OrderCreationScreen extends ConsumerStatefulWidget {
  const OrderCreationScreen({super.key});

  @override
  ConsumerState<OrderCreationScreen> createState() => _OrderCreationScreenState();
}

class _OrderCreationScreenState extends ConsumerState<OrderCreationScreen> {
  final _currencyFormat = NumberFormat.currency(locale: 'fr_CM', symbol: 'FCFA', decimalDigits: 0);

  // Default customer selection
  Customer? _selectedCustomer;
  final Map<String, int> _quantities = {}; // productId -> quantity of crates
  final Map<String, bool> _chargeDeposit = {}; // productId -> whether packaging deposit is charged

  // Default initial products catalog
  final List<Product> _catalog = [
    const Product(
      id: 'prod_33_export',
      name: '"33" Export 65cl',
      category: 'Bière Blonde',
      crateCapacity: 12,
      liquidPrice: 6500,
      crateDepositPrice: 1500,
      bottleDepositPrice: 125,
      totalCratePrice: 8000,
      sku: '33EXP-65',
    ),
    const Product(
      id: 'prod_kadji',
      name: 'Kadji Beer 65cl',
      category: 'Bière Premium',
      crateCapacity: 12,
      liquidPrice: 7200,
      crateDepositPrice: 1500,
      bottleDepositPrice: 125,
      totalCratePrice: 8700,
      sku: 'KADJI-65',
    ),
    const Product(
      id: 'prod_castel',
      name: 'Castel Beer 65cl',
      category: 'Bière Blonde',
      crateCapacity: 12,
      liquidPrice: 6500,
      crateDepositPrice: 1500,
      bottleDepositPrice: 125,
      totalCratePrice: 8000,
      sku: 'CASTEL-65',
    ),
    const Product(
      id: 'prod_guinness',
      name: 'Guinness FES 33cl',
      category: 'Stout',
      crateCapacity: 24,
      liquidPrice: 10500,
      crateDepositPrice: 2000,
      bottleDepositPrice: 85,
      totalCratePrice: 12500,
      sku: 'GUIN-33',
    ),
    const Product(
      id: 'prod_top_pample',
      name: 'Top Pamplemousse 60cl',
      category: 'Gazeuse',
      crateCapacity: 12,
      liquidPrice: 4800,
      crateDepositPrice: 1500,
      bottleDepositPrice: 125,
      totalCratePrice: 6300,
      sku: 'TOP-PAMP',
    ),
  ];

  final List<Customer> _customers = [
    const Customer(
      id: 'cust_boukarou',
      name: 'Bar Le Boukarou Eséka',
      type: 'BAR',
      ownerName: 'M. Nlend Joseph',
      phone: '+237 677 12 34 56',
      quarter: 'Quartier Gare',
      emptyCratesBalance: -24,
    ),
    const Customer(
      id: 'cust_cave_palmier',
      name: 'Cave Le Palmier Royal',
      type: 'CAVE',
      ownerName: 'Mme Ngo Mandeng',
      phone: '+237 699 98 76 54',
      quarter: 'Marché Central',
      emptyCratesBalance: -12,
    ),
    const Customer(
      id: 'cust_oasis_carrefour',
      name: 'Boutique Snack L\'Oasis',
      type: 'SNACK',
      ownerName: 'M. Biyong Pierre',
      phone: '+237 655 44 33 22',
      quarter: 'Carrefour Hôpital',
      emptyCratesBalance: 0,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _selectedCustomer = _customers.first;
    for (final p in _catalog) {
      _quantities[p.id] = 0;
      _chargeDeposit[p.id] = false; // default: client exchanges empties
    }
    // Set 2 default crates for easy demo
    _quantities['prod_33_export'] = 5;
    _quantities['prod_kadji'] = 3;
  }

  int get totalCrates => _quantities.values.fold(0, (a, b) => a + b);

  int get totalLiquidAmount {
    int sum = 0;
    for (final p in _catalog) {
      final qty = _quantities[p.id] ?? 0;
      sum += qty * p.liquidPrice;
    }
    return sum;
  }

  int get totalDepositAmount {
    int sum = 0;
    for (final p in _catalog) {
      final qty = _quantities[p.id] ?? 0;
      final charge = _chargeDeposit[p.id] ?? false;
      if (charge) {
        sum += qty * p.crateDepositPrice;
      }
    }
    return sum;
  }

  int get totalOrderAmount => totalLiquidAmount + totalDepositAmount;

  Future<void> _saveOrder() async {
    if (_selectedCustomer == null || totalCrates == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez sélectionner au moins un casier de boisson.')),
      );
      return;
    }

    final orderId = 'ord_${const Uuid().v4().substring(0, 8)}';
    final user = ref.read(currentUserProvider);

    final items = <OrderItem>[];
    for (final p in _catalog) {
      final qty = _quantities[p.id] ?? 0;
      if (qty > 0) {
        items.add(OrderItem(
          productId: p.id,
          productName: p.name,
          quantityCrates: qty,
          unitLiquidPrice: p.liquidPrice,
          unitDepositPrice: p.crateDepositPrice,
          chargeDeposit: _chargeDeposit[p.id] ?? false,
        ));
      }
    }

    final newOrder = Order(
      id: orderId,
      customerId: _selectedCustomer!.id,
      customerName: _selectedCustomer!.name,
      customerPhone: _selectedCustomer!.phone,
      quarter: _selectedCustomer!.quarter,
      depositId: user?.depositId ?? 'depot_eseka_centre',
      items: items,
      totalLiquidAmount: totalLiquidAmount,
      totalDepositAmount: totalDepositAmount,
      totalAmount: totalOrderAmount,
      totalCrates: totalCrates,
      status: OrderStatus.pending,
      createdAt: DateTime.now(),
    );

    // Save locally into Drift SQLite
    final localService = ref.read(localDataServiceProvider);
    await localService.createDocument(
      collection: 'orders',
      docId: newOrder.id,
      depositId: newOrder.depositId,
      data: newOrder.toJson(),
    );

    // Debounced sync engine trigger
    ref.read(syncServiceProvider).notifyLocalWrite();

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: const Color(0xFF0F766E),
          content: Text('Commande enregistrée en local (Drift SQLite): $orderId (${totalCrates} casiers)'),
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
        title: const Text('Nouvelle Commande Client'),
        actions: [
          IconButton(
            icon: const Icon(Icons.check_circle_outline_rounded),
            tooltip: 'Enregistrer Commande',
            onPressed: _saveOrder,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Customer Selector Card
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
                  const Text(
                    'Client & Emplacement (Eséka)',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E293B)),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<Customer>(
                    value: _selectedCustomer,
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: const Color(0xFFF1F5F9),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide.none,
                      ),
                    ),
                    items: _customers.map((c) {
                      return DropdownMenuItem<Customer>(
                        value: c,
                        child: Text('${c.name} (${c.quarter})'),
                      );
                    }).toList(),
                    onChanged: (val) {
                      setState(() => _selectedCustomer = val);
                    },
                  ),
                  if (_selectedCustomer != null) ...[
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Gérant: ${_selectedCustomer!.ownerName}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                        Text(
                          'Solde casiers: ${_selectedCustomer!.emptyCratesBalance} casiers',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: _selectedCustomer!.emptyCratesBalance < 0
                                ? const Color(0xFFD97706)
                                : const Color(0xFF10B981),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Products Catalog Table
            const Text(
              'Sélection des Boissons & Casiers',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF1E293B)),
            ),
            const SizedBox(height: 8),

            ..._catalog.map((product) {
              final qty = _quantities[product.id] ?? 0;
              final charge = _chargeDeposit[product.id] ?? false;
              final lineLiquid = qty * product.liquidPrice;
              final lineDeposit = charge ? qty * product.crateDepositPrice : 0;

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: qty > 0 ? const Color(0xFFD97706) : const Color(0xFFE2E8F0),
                    width: qty > 0 ? 1.5 : 1,
                  ),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                product.name,
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${product.category} · ${product.crateCapacity} btls · ${_currencyFormat.format(product.liquidPrice)} /casier',
                                style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        // Qty counter
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove_circle_outline, color: Color(0xFF64748B)),
                              onPressed: qty > 0
                                  ? () => setState(() => _quantities[product.id] = qty - 1)
                                  : null,
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '$qty',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.add_circle, color: Color(0xFFD97706)),
                              onPressed: () => setState(() => _quantities[product.id] = qty + 1),
                            ),
                          ],
                        ),
                      ],
                    ),
                    if (qty > 0) ...[
                      const Divider(height: 16, color: Color(0xFFF1F5F9)),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Checkbox(
                                value: charge,
                                activeColor: const Color(0xFFD97706),
                                onChanged: (v) => setState(() => _chargeDeposit[product.id] = v ?? false),
                              ),
                              Text(
                                'Facturer consigne casier (+${_currencyFormat.format(product.crateDepositPrice)}/c)',
                                style: const TextStyle(fontSize: 12, color: Color(0xFF475569)),
                              ),
                            ],
                          ),
                          Text(
                            _currencyFormat.format(lineLiquid + lineDeposit),
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E293B)),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              );
            }),

            const SizedBox(height: 16),

            // Order Summary Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Casiers pleins:', style: TextStyle(color: Colors.white70)),
                      Text('$totalCrates casiers', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Sous-total Liquide:', style: TextStyle(color: Colors.white70)),
                      Text(_currencyFormat.format(totalLiquidAmount), style: const TextStyle(color: Colors.white)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Consignes Emballages:', style: TextStyle(color: Colors.white70)),
                      Text(_currencyFormat.format(totalDepositAmount), style: const TextStyle(color: Colors.white)),
                    ],
                  ),
                  const Divider(color: Color(0xFF334155), height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'TOTAL COMMANDE:',
                        style: TextStyle(color: Color(0xFFF59E0B), fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      Text(
                        _currencyFormat.format(totalOrderAmount),
                        style: const TextStyle(color: Color(0xFFF59E0B), fontWeight: FontWeight.w800, fontSize: 18),
                      ),
                    ],
                  ),
                ],
              ),
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
                icon: const Icon(Icons.save_rounded),
                label: Text(
                  'Valider & Enregistrer la Commande (${totalCrates} casiers)',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                onPressed: _saveOrder,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
