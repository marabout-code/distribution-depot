import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/app_providers.dart';

class PinLoginScreen extends ConsumerStatefulWidget {
  const PinLoginScreen({super.key});

  @override
  ConsumerState<PinLoginScreen> createState() => _PinLoginScreenState();
}

class _PinLoginScreenState extends ConsumerState<PinLoginScreen> {
  String _enteredPin = '';
  String? _errorMessage;
  int? _lockoutSeconds;
  Timer? _lockoutTimer;
  bool _isLoading = false;

  void _onDigitPressed(String digit) {
    if (_lockoutSeconds != null && _lockoutSeconds! > 0) return;
    if (_enteredPin.length < 4) {
      setState(() {
        _enteredPin += digit;
        _errorMessage = null;
      });
      if (_enteredPin.length == 4) {
        _submitPin();
      }
    }
  }

  void _onBackspace() {
    if (_enteredPin.isNotEmpty) {
      setState(() {
        _enteredPin = _enteredPin.substring(0, _enteredPin.length - 1);
        _errorMessage = null;
      });
    }
  }

  void _onClear() {
    setState(() {
      _enteredPin = '';
      _errorMessage = null;
    });
  }

  void _startLockoutCountdown(int seconds) {
    setState(() {
      _lockoutSeconds = seconds;
      _enteredPin = '';
    });
    _lockoutTimer?.cancel();
    _lockoutTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_lockoutSeconds! <= 1) {
        timer.cancel();
        setState(() {
          _lockoutSeconds = null;
          _errorMessage = null;
        });
      } else {
        setState(() {
          _lockoutSeconds = _lockoutSeconds! - 1;
        });
      }
    });
  }

  Future<void> _submitPin({String? specificPin}) async {
    final pin = specificPin ?? _enteredPin;
    setState(() => _isLoading = true);

    final authNotifier = ref.read(currentUserProvider.notifier);
    final result = await authNotifier.loginWithPin(pin);

    setState(() => _isLoading = false);

    if (result.success) {
      // Login success, provider state triggers navigation
    } else {
      setState(() {
        _errorMessage = result.errorMessage;
        _enteredPin = '';
      });
      if (result.lockoutSecondsRemaining != null) {
        _startLockoutCountdown(result.lockoutSecondsRemaining!);
      }
    }
  }

  @override
  void dispose() {
    _lockoutTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final syncStats = ref.watch(syncStatsStreamProvider).valueOrNull;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar: Offline & Depot Identity
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          syncStats?.status.name == 'offline' ? 'Hors-Ligne' : 'Connecté',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: syncStats?.status.name == 'offline'
                                ? const Color(0xFFFBBF24)
                                : const Color(0xFF34D399),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Dépôt Central Eséka',
                        style: TextStyle(color: Colors.slate[400], fontSize: 13),
                      ),
                    ],
                  ),
                  const Text(
                    'FCFA (XAF)',
                    style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),

            const Spacer(),

            // Branding & Header
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: const Color(0xFFD97706),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.local_shipping_rounded, color: Colors.white, size: 36),
            ),
            const SizedBox(height: 16),
            const Text(
              'Eséka Distribution',
              style: TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Entrez votre code PIN à 4 chiffres (100% Offline)',
              style: TextStyle(color: Colors.slate[400], fontSize: 13),
            ),

            const SizedBox(height: 32),

            // 4-PIN Dots Indicator
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(4, (index) {
                final isFilled = index < _enteredPin.length;
                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 10),
                  width: 18,
                  height: 18,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isFilled ? const Color(0xFFD97706) : const Color(0xFF334155),
                    border: Border.all(
                      color: isFilled ? const Color(0xFFF59E0B) : const Color(0xFF475569),
                      width: 2,
                    ),
                  ),
                );
              }),
            ),

            // Error or Lockout Message
            Container(
              height: 44,
              alignment: Alignment.center,
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: _lockoutSeconds != null
                  ? Text(
                      'Sécurité: Bloqué pendant $_lockoutSeconds s',
                      style: const TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.bold),
                    )
                  : (_errorMessage != null
                      ? Text(
                          _errorMessage!,
                          style: const TextStyle(color: Color(0xFFF87171), fontSize: 13),
                          textAlign: TextAlign.center,
                        )
                      : null),
            ),

            const Spacer(),

            // 4-Digit Numpad
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              constraints: const BoxConstraints(maxWidth: 340),
              child: Column(
                children: [
                  _buildNumpadRow(['1', '2', '3']),
                  const SizedBox(height: 16),
                  _buildNumpadRow(['4', '5', '6']),
                  const SizedBox(height: 16),
                  _buildNumpadRow(['7', '8', '9']),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildActionKey(
                        label: 'C',
                        onTap: _onClear,
                        color: Colors.slate[600],
                      ),
                      _buildNumberKey('0'),
                      _buildActionKey(
                        icon: Icons.backspace_outlined,
                        onTap: _onBackspace,
                        color: Colors.slate[400],
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const Spacer(),

            // Demo Quick Accounts Bar
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.key_rounded, size: 14, color: Colors.amber[400]),
                      const SizedBox(width: 6),
                      Text(
                        'Accès Rapide Démo (Comptes Pré-enregistrés)',
                        style: TextStyle(color: Colors.amber[400], fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      _buildDemoChip('Superadmin (1111)', '1111'),
                      _buildDemoChip('Chef Dépôt (2222)', '2222'),
                      _buildDemoChip('Chauffeur Camion (3333)', '3333'),
                      _buildDemoChip('Chauffeur Tricycle (4444)', '4444'),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDemoChip(String label, String pin) {
    return InkWell(
      onTap: () => _submitPin(specificPin: pin),
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: const Color(0xFF334155),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: const TextStyle(color: Colors.white, fontSize: 11),
        ),
      ),
    );
  }

  Widget _buildNumpadRow(List<String> digits) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: digits.map((d) => _buildNumberKey(d)).toList(),
    );
  }

  Widget _buildNumberKey(String digit) {
    final isDisabled = _lockoutSeconds != null && _lockoutSeconds! > 0;
    return InkWell(
      onTap: isDisabled ? null : () => _onDigitPressed(digit),
      borderRadius: BorderRadius.circular(36),
      child: Container(
        width: 72,
        height: 72,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: const Color(0xFF1E293B),
          border: Border.all(color: const Color(0xFF334155)),
        ),
        child: Text(
          digit,
          style: TextStyle(
            color: isDisabled ? Colors.white30 : Colors.white,
            fontSize: 26,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildActionKey({String? label, IconData? icon, required VoidCallback onTap, Color? color}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(36),
      child: Container(
        width: 72,
        height: 72,
        alignment: Alignment.center,
        child: icon != null
            ? Icon(icon, color: color, size: 24)
            : Text(label ?? '', style: TextStyle(color: color, fontSize: 22, fontWeight: FontWeight.bold)),
      ),
    );
  }
}
