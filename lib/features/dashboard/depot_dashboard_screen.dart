import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../providers/app_providers.dart';

class DepotDashboardScreen extends ConsumerWidget {
  const DepotDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final _currencyFormat = NumberFormat.currency(locale: 'fr_CM', symbol: 'FCFA', decimalDigits: 0);
    final user = ref.watch(currentUserProvider);
    final syncStats = ref.watch(syncStatsStreamProvider).valueOrNull;

    // Daily simulated / computed metrics
    const totalSales = 2450000; // FCFA
    const deliveredCrates = 312;
    const emptiesReturned = 296;
    const cashTotal = 1550000;
    const momoTotal = 620000;
    const omTotal = 280000;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Eséka Distribution · Dépôt'),
            Text(
              user != null ? '${user.userName} (${user.role.toUpperCase()})' : 'Mode Administrateur',
              style: const TextStyle(fontSize: 11, color: Colors.white70),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync_rounded),
            tooltip: 'Synchroniser Supabase',
            onPressed: () {
              ref.read(syncServiceProvider).syncNow(reason: 'Dashboard manual sync');
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Synchronisation avec Supabase Cloud lancée...')),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Déconnexion',
            onPressed: () => ref.read(currentUserProvider.notifier).logout(),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Sync Engine Banner (Drift SQLite <-> Supabase)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: syncStats?.status.name == 'offline' ? const Color(0xFFFEF3C7) : const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: syncStats?.status.name == 'offline' ? const Color(0xFFFCD34D) : const Color(0xFFBBF7D0),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    syncStats?.status.name == 'offline' ? Icons.cloud_off_rounded : Icons.cloud_done_rounded,
                    size: 18,
                    color: syncStats?.status.name == 'offline' ? const Color(0xFFB45309) : const Color(0xFF15803D),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      syncStats?.status.name == 'offline'
                          ? 'Mode 100% Hors-Ligne (Drift SQLite actif · ${syncStats?.pendingDirtyCount ?? 0} modifs en attente)'
                          : 'Connecté · Base locale Drift synchronisée avec Supabase',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: syncStats?.status.name == 'offline' ? const Color(0xFF92400E) : const Color(0xFF166534),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Main KPI Cards
            Row(
              children: [
                Expanded(
                  child: _buildMetricCard(
                    title: 'Ventes du Jour',
                    value: _currencyFormat.format(totalSales),
                    subtitle: '+14% vs hier',
                    color: const Color(0xFFD97706),
                    icon: Icons.payments_rounded,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildMetricCard(
                    title: 'Casiers Livrés',
                    value: '$deliveredCrates casiers',
                    subtitle: 'Emballages 12 & 24 btls',
                    color: const Color(0xFF0F766E),
                    icon: Icons.inventory_2_rounded,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: _buildMetricCard(
                    title: 'Casiers Vides Récupérés',
                    value: '$emptiesReturned casiers',
                    subtitle: 'Solde: ${emptiesReturned - deliveredCrates} casiers',
                    color: const Color(0xFF2563EB),
                    icon: Icons.recycling_rounded,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildMetricCard(
                    title: 'Tournées Clôturées',
                    value: '3 / 4 tournées',
                    subtitle: '1 en cours de livraison',
                    color: const Color(0xFF7C3AED),
                    icon: Icons.local_shipping_rounded,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Payment Collections Breakdown Card
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
                    'Ventilation des Encaissements (FCFA)',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E293B)),
                  ),
                  const SizedBox(height: 14),
                  _buildPaymentBar('Espèces (Cash en caisse)', cashTotal, totalSales, const Color(0xFF0F766E), _currencyFormat),
                  const SizedBox(height: 10),
                  _buildPaymentBar('MTN Mobile Money (MoMo)', momoTotal, totalSales, const Color(0xFFEAB308), _currencyFormat),
                  const SizedBox(height: 10),
                  _buildPaymentBar('Orange Money (OM)', omTotal, totalSales, const Color(0xFFF97316), _currencyFormat),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Quick Operations Actions
            const Text(
              'Opérations Rapides Dépôt',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E293B)),
            ),
            const SizedBox(height: 10),

            Row(
              children: [
                Expanded(
                  child: _buildActionButton(
                    context: context,
                    label: 'Nouvelle Commande',
                    icon: Icons.add_shopping_cart_rounded,
                    color: const Color(0xFFD97706),
                    onTap: () => Navigator.pushNamed(context, '/orders/create'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildActionButton(
                    context: context,
                    label: 'Planifier Tournée',
                    icon: Icons.alt_route_rounded,
                    color: const Color(0xFF0F766E),
                    onTap: () => Navigator.pushNamed(context, '/tours/plan'),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 10),

            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF1E293B),
                  side: const BorderSide(color: Color(0xFFCBD5E1)),
                  shape: BorderRadius.circular(12),
                ),
                icon: const Icon(Icons.phone_android_rounded),
                label: const Text('Ouvrir l\'Interface Tournée Chauffeur'),
                onPressed: () => Navigator.pushNamed(context, '/driver/tour'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required String subtitle,
    required Color color,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
              Icon(icon, size: 18, color: color),
            ],
          ),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: color)),
          const SizedBox(height: 2),
          Text(subtitle, style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
        ],
      ),
    );
  }

  Widget _buildPaymentBar(String label, int amount, int total, Color color, NumberFormat format) {
    final pct = total > 0 ? (amount / total) : 0.0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF334155), fontWeight: FontWeight.w500)),
            Text('${format.format(amount)} (${(pct * 100).toStringAsFixed(0)}%)',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: pct,
            backgroundColor: const Color(0xFFF1F5F9),
            color: color,
            minHeight: 6,
          ),
        ),
      ],
    );
  }

  Widget _buildActionButton({
    required BuildContext context,
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 18),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
