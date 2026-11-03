// ====================================================================
// PONDYCODE - OFFICIAL DEVELOPER LICENSE KEY GENERATOR (DART)
// Runs on the Developer Machine to generate activation unlock codes
// Contact: pondycode@gmail.com | WhatsApp: +237 674 66 72 34
// ====================================================================

import 'dart:convert';
import 'package:crypto/crypto.dart';

const String developerMasterSecret = 'PONDYCODE_ESEKA_KEYGEN_2026_MASTER_SECRET';

String generateDeveloperUnlockCode(String machineId, [String secret = developerMasterSecret]) {
  final clean = machineId.trim().toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
  final combined = '$clean:$secret';

  // Compute SHA-256 HMAC-like hash
  final bytes = utf8.encode(combined);
  final digest = sha256.convert(bytes);
  final hex = digest.toString().toUpperCase();

  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  final result = StringBuffer();

  // Deterministic mapping to 12 alphanumeric characters
  for (int i = 0; i < 12; i++) {
    final sub = hex.substring(i * 2, i * 2 + 4);
    final val = int.parse(sub, radix: 16);
    result.write(chars[val % chars.length]);
  }

  final code = result.toString();
  return 'PONDY-${code.substring(0, 4)}-${code.substring(4, 8)}-${code.substring(8, 12)}';
}

void main(List<String> args) {
  print('================================================================');
  print('  PONDYCODE - ESEKA DISTRIBUTION DEVELOPER KEYGEN TOOL');
  print('  Support: pondycode@gmail.com | WhatsApp: +237 674 66 72 34');
  print('================================================================\n');

  if (args.isEmpty) {
    print('Usage: dart run scripts/developer_keygen.dart <MACHINE_ID>');
    print('Example: dart run scripts/developer_keygen.dart ESK-8F2A-4D91\n');

    // Generate demo for default machine
    final demoMachine = 'ESK-8F2A-4D91';
    final key = generateDeveloperUnlockCode(demoMachine);
    print('Exemple de génération pour la machine démo :');
    print('Machine ID   : $demoMachine');
    print('Clé Débloquée : $key');
    return;
  }

  final machineId = args[0];
  final generatedKey = generateDeveloperUnlockCode(machineId);

  print('Identifiant Machine Client : $machineId');
  print('----------------------------------------------------------------');
  print('CLE DE DEBLOCAGE OFFICIELLE : $generatedKey');
  print('----------------------------------------------------------------');
  print('Envoyez cette clé au client via WhatsApp (+237674667234).');
}
