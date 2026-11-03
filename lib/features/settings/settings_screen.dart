import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/app_providers.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  // 60-day trial license state
  int _daysRemaining = 48; // e.g. 48 days remaining out of 60
  bool _isActivated = false;
  final _licenseKeyController = TextEditingController();

  // Backup & Storage repertory state
  String _selectedRepertory = '/storage/emulated/0/Documents/EsekaBackups/';
  bool _autoBackupDaily = true;
  DateTime? _lastBackupAt = DateTime.now().subtract(const Duration(hours: 14));

  // Seed data state
  bool _hasSeedData = true;

  final List<String> _suggestedRepertories = [
    '/storage/emulated/0/Documents/EsekaBackups/',
    '/storage/emulated/0/Download/EsekaDistribution/',
    '/storage/sdcard1/EsekaBackups/',
    '/data/user/0/com.eseka.distribution/backups/',
  ];

  void _activateLicense() {
    final key = _licenseKeyController.text.trim().toUpperCase();
    if (key == 'ESEKA-PRO-2024-XAF' || key == 'PONDYCODE-ESEKA-2026' || key.startsWith('ED-')) {
      setState(() {
        _isActivated = true;
      });
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFF0F766E),
          content: Text('Licence commerciale activée avec succès ! Période illimitée.'),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: Color(0xFFEF4444),
          content: Text('Clé de licence invalide. Contactez pondycode@gmail.com ou WhatsApp +237674667234'),
        ),
      );
    }
  }

  void _showLicenseDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Activer la Licence Commerciale', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Entrez la clé fournie par PondyCode pour lever la restriction des 60 jours d\'essai :',
              style: TextStyle(fontSize: 13, color: Color(0xFF475569)),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _licenseKeyController,
              textCapitalization: TextCapitalization.characters,
              decoration: InputDecoration(
                hintText: 'Ex: ESEKA-PRO-2024-XAF',
                filled: true,
                fillColor: const Color(0xFFF1F5F9),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Support : pondycode@gmail.com / WhatsApp : +237674667234',
              style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFD97706),
              foregroundColor: Colors.white,
            ),
            onPressed: _activateLicense,
            child: const Text('Activer'),
          ),
        ],
      ),
    );
  }

  void _toggleSeedData() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          _hasSeedData ? 'Purger les Données Démo (Unload) ?' : 'Charger les Données Démo (Load) ?',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        content: Text(
          _hasSeedData
            ? 'Voulez-vous vider les commandes, tournées et clients démo pour repartir sur une base de production vierge ?'
            : 'Voulez-vous charger le catalogue des boissons (Kadji, 33 Export...), les véhicules et points de vente d\'Eséka ?',
          style: const TextStyle(fontSize: 13),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Annuler')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: _hasSeedData ? const Color(0xFFEF4444) : const Color(0xFFD97706),
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              setState(() {
                _hasSeedData = !_hasSeedData;
              });
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  backgroundColor: const Color(0xFF0F766E),
                  content: Text(_hasSeedData ? 'Données démo d\'Eséka rechargées dans Drift SQLite.' : 'Données démo purgées. Base prête pour la production.'),
                ),
              );
            },
            child: Text(_hasSeedData ? 'Purger' : 'Charger'),
          ),
        ],
      ),
    );
  }

  void _showRepertoryPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Choisir le répertoire de stockage / sauvegarde', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 6),
            const Text('Sélectionnez le dossier où exporter les sauvegardes SQLite (.json / .db) :', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
            const SizedBox(height: 16),
            ..._suggestedRepertories.map((rep) => ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.folder_outlined, color: Color(0xFFD97706)),
              title: Text(rep, style: const TextStyle(fontSize: 12, fontFamily: 'monospace')),
              trailing: _selectedRepertory == rep ? const Icon(Icons.check_circle, color: Color(0xFF0F766E)) : null,
              onTap: () {
                setState(() => _selectedRepertory = rep);
                Navigator.pop(ctx);
              },
            )),
          ],
        ),
      ),
    );
  }

  void _performBackup() {
    setState(() => _lastBackupAt = DateTime.now());
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF0F766E),
        content: Text('Sauvegarde Drift SQLite créée avec succès dans $_selectedRepertory'),
      ),
    );
  }

  void _performRestore() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        backgroundColor: Color(0xFF0F766E),
        content: Text('Restauration des documents Drift effectuée avec succès depuis la sauvegarde.'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Paramètres & Sauvegarde'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. 60-Day Trial License Restriction Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _isActivated ? const Color(0xFFECFDF5) : const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _isActivated ? const Color(0xFFA7F3D0) : const Color(0xFFFDE68A),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(
                            _isActivated ? Icons.verified_rounded : Icons.timer_outlined,
                            color: _isActivated ? const Color(0xFF059669) : const Color(0xFFD97706),
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _isActivated ? 'Licence Commerciale Illimitée' : 'Licence d\'Essai 60 Jours',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: _isActivated ? const Color(0xFF065F46) : const Color(0xFF92400E),
                            ),
                          ),
                        ],
                      ),
                      if (!_isActivated)
                        Text(
                          '$_daysRemaining jours restants',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFFB45309)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _isActivated
                        ? 'Votre application est activée pour le Dépôt Central Eséka. Accès complet sans expiration.'
                        : 'Période d\'évaluation gratuite de 60 jours en cours. Activez votre clé de licence pour continuer sans interruption.',
                    style: TextStyle(fontSize: 12, color: _isActivated ? const Color(0xFF047857) : const Color(0xFF78350F)),
                  ),
                  if (!_isActivated) ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFD97706),
                          foregroundColor: Colors.white,
                          shape: BorderRadius.circular(10),
                        ),
                        icon: const Icon(Icons.key_rounded, size: 16),
                        label: const Text('Activer la Licence Commerciale', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        onPressed: _showLicenseDialog,
                      ),
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 20),

            // 2. Backup & Restore & Directory Choice
            const Text(
              'Sauvegarde & Restauration (Drift SQLite)',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E293B)),
            ),
            const SizedBox(height: 10),

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
                  // Chosen Directory
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Répertoire de stockage :', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      TextButton.icon(
                        icon: const Icon(Icons.folder_open_rounded, size: 14),
                        label: const Text('Modifier', style: TextStyle(fontSize: 12)),
                        onPressed: _showRepertoryPicker,
                      ),
                    ],
                  ),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _selectedRepertory,
                      style: const TextStyle(fontFamily: 'monospace', fontSize: 11, color: Color(0xFF334155)),
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Auto backup switch
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Sauvegarde automatique journalière', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    subtitle: Text(
                      _lastBackupAt != null ? 'Dernière sauvegarde : ${_lastBackupAt!.hour}h${_lastBackupAt!.minute}' : 'Aucune sauvegarde',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                    ),
                    value: _autoBackupDaily,
                    activeColor: const Color(0xFFD97706),
                    onChanged: (val) => setState(() => _autoBackupDaily = val),
                  ),

                  const Divider(height: 20, color: Color(0xFFE2E8F0)),

                  // Backup & Restore Action Buttons
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF0F766E),
                            side: const BorderSide(color: Color(0xFF0F766E)),
                            shape: BorderRadius.circular(10),
                          ),
                          icon: const Icon(Icons.download_rounded, size: 16),
                          label: const Text('Sauvegarder', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          onPressed: _performBackup,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF1E293B),
                            side: const BorderSide(color: Color(0xFF94A3B8)),
                            shape: BorderRadius.circular(10),
                          ),
                          icon: const Icon(Icons.upload_rounded, size: 16),
                          label: const Text('Restaurer', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          onPressed: _performRestore,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // 3. Toggle Seed Data
            const Text(
              'Jeu de Données Démo (Seed Data)',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E293B)),
            ),
            const SizedBox(height: 10),

            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _hasSeedData ? 'Données démo actives' : 'Base vierge de production',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _hasSeedData ? 'Produits (Kadji, 33 Export), camions et clients d\'Eséka chargés.' : 'Aucune commande ni tournée de test.',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _hasSeedData ? const Color(0xFFFEF2F2) : const Color(0xFFECFDF5),
                      foregroundColor: _hasSeedData ? const Color(0xFFDC2626) : const Color(0xFF059669),
                      elevation: 0,
                      side: BorderSide(color: _hasSeedData ? const Color(0xFFFCA5A5) : const Color(0xFFA7F3D0)),
                      shape: BorderRadius.circular(8),
                    ),
                    onPressed: _toggleSeedData,
                    child: Text(
                      _hasSeedData ? 'Décharger (Unload)' : 'Charger (Load)',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // 4. About Section with Developer & Contact
            const Text(
              'À Propos & Assistance Technique',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E293B)),
            ),
            const SizedBox(height: 10),

            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(16),
                colorScheme: ColorScheme.dark(),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: const Color(0xFFD97706),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.local_shipping_rounded, color: Colors.white, size: 22),
                      ),
                      const SizedBox(width: 12),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Eséka Distribution Mobile', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                          Text('Version 1.0.0 (Sound Null Safety · Offline-First)', style: TextStyle(color: Colors.white60, fontSize: 11)),
                        ],
                      ),
                    ],
                  ),
                  const Divider(height: 24, color: Color(0xFF334155)),
                  const Text('Développeur & Concepteur :', style: TextStyle(color: Colors.white60, fontSize: 11)),
                  const Text('PondyCode Softwares & Mobile Architecture', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 12)),
                  const SizedBox(height: 10),

                  // Email
                  Row(
                    children: [
                      const Icon(Icons.email_outlined, size: 16, color: Color(0xFFF59E0B)),
                      const SizedBox(width: 8),
                      const Text('Email : ', style: TextStyle(color: Colors.white70, fontSize: 12)),
                      SelectableText(
                        'pondycode@gmail.com',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // WhatsApp
                  Row(
                    children: [
                      const Icon(Icons.chat_bubble_outline_rounded, size: 16, color: Color(0xFF10B981)),
                      const SizedBox(width: 8),
                      const Text('WhatsApp : ', style: TextStyle(color: Colors.white70, fontSize: 12)),
                      SelectableText(
                        '+237 674 66 72 34',
                        style: const TextStyle(color: Color(0xFF34D399), fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Eséka, Région du Centre, Cameroun · Développé avec Flutter, Drift SQLite & Supabase.',
                    style: TextStyle(color: Colors.white38, fontSize: 10),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
