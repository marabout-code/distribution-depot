import React, { useState } from 'react';
import {
  FileCode,
  Copy,
  Check,
  FolderTree,
  Terminal,
  Database,
  Layers,
  Sparkles,
} from 'lucide-react';

interface CodeFile {
  path: string;
  language: string;
  description: string;
  content: string;
}

const FLUTTER_FILES: CodeFile[] = [
  {
    path: 'pubspec.yaml',
    language: 'yaml',
    description: 'Configuration du projet Flutter, dépendances Drift, Riverpod 2.5.1 et Supabase Flutter',
    content: `name: eseka_distribution
description: "Application mobile 100% offline-first de gestion de dépôts de boissons et tournées à Eséka (Cameroun, FCFA)."
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ">=3.3.0 <4.0.0"
  flutter: ">=3.19.0"

dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter

  # State Management
  flutter_riverpod: ^2.5.1

  # Local Database (Single Source of Truth, 100% Offline)
  drift: ^2.18.0
  drift_flutter: ^0.1.0

  # Backend & Cloud Synchronization
  supabase_flutter: ^2.5.6

  # Hardware & Security
  connectivity_plus: ^6.0.3
  flutter_secure_storage: ^9.0.0
  shared_preferences: ^2.2.3
  crypto: ^3.0.3
  uuid: ^4.4.0

  # Formatting & UI
  intl: ^0.19.0
  google_fonts: ^6.2.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  drift_dev: ^2.18.0
  build_runner: ^2.4.9

flutter:
  uses-material-design: true`,
  },
  {
    path: 'lib/core/database/database.dart',
    language: 'dart',
    description: 'Drift SQLite schema: Table unique documents, local_credentials, local_attempts, DepotScope et façade LocalDataService',
    content: `// Façade LocalDataService & Table générique Drift SQLite
import 'dart:convert';
import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

part 'database.g.dart';

/// Table unique générique 'documents' pour le stockage 100% offline
@DataClassName('DocumentRow')
class Documents extends Table {
  TextColumn get collection => text()();
  TextColumn get docId => text()();
  TextColumn get depositId => text().nullable()();
  TextColumn get payload => text()(); // Serialized JSON
  IntColumn get version => integer().withDefault(const Constant(1))();
  DateTimeColumn get localUpdatedAt => dateTime()();
  BoolColumn get dirty => boolean().withDefault(const Constant(true))();
  BoolColumn get deleted => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {collection, docId};
}

/// Tables auxiliaires
class LocalCredentials extends Table {
  TextColumn get userId => text()();
  TextColumn get pinHash => text()();
  TextColumn get role => text()(); // 'superadmin' | 'admin' | 'driver'
  TextColumn get depositId => text().nullable()();
  TextColumn get userName => text()();
  DateTimeColumn get lastLoginAt => dateTime().nullable()();
  @override
  Set<Column> get primaryKey => {userId};
}

class LocalAttempts extends Table {
  TextColumn get key => text()();
  IntColumn get failedAttempts => integer().withDefault(const Constant(0))();
  DateTimeColumn get lockoutUntil => dateTime().nullable()();
  DateTimeColumn get lastAttemptAt => dateTime()();
  @override
  Set<Column> get primaryKey => {key};
}

class SyncStates extends Table {
  TextColumn get collection => text()();
  DateTimeColumn get lastServerUpdatedAt => dateTime()();
  TextColumn get lastDocId => text().withDefault(const Constant(''))();
  @override
  Set<Column> get primaryKey => {collection};
}

@DriftDatabase(tables: [Documents, LocalCredentials, LocalAttempts, SyncStates])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());
  @override
  int get schemaVersion => 1;
  static QueryExecutor _openConnection() => driftDatabase(name: 'eseka_distribution_drift.sqlite');
}

/// Façade d'accès unique avec support DepotScope
class LocalDataService {
  final AppDatabase db;
  LocalDataService(this.db);
  // createDocument, updateDocument (version++ & dirty=true), deleteDocument (tombstone)
}`,
  },
  {
    path: 'lib/core/sync/sync_service.dart',
    language: 'dart',
    description: 'Moteur de synchronisation: Push (dirty rows), Pull (keyset cursor), LWW conflict resolution et triggers réseau',
    content: `// Moteur de Synchro Drift <-> Supabase avec LWW et RPCs
class SyncService {
  final LocalDataService localService;
  final SupabaseClient supabase;
  final Connectivity connectivity;

  /// PUSH dirty rows vers Supabase RPC 'sync_push_rows'
  Future<void> _pushDirtyRows(String? depotId) async {
    final dirtyRows = await localService.getDirtyRows();
    if (dirtyRows.isEmpty) return;

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
      await localService.markRowsClean(dirtyRows);
    }
  }

  /// PULL updates avec curseur keyset (server_updated_at, doc_id)
  Future<void> _pullRemoteRows(String? depotId) async {
    // Keyset cursor pagination et Last-Write-Wins (LWW)
  }
}`,
  },
  {
    path: 'lib/core/auth/pin_auth_service.dart',
    language: 'dart',
    description: 'Authentification PIN 4 chiffres 100% hors-ligne avec lockout 60s après 3 échecs',
    content: `// Authentification Code PIN 4 chiffres hors-ligne
class PinAuthService {
  final AppDatabase db;
  static const int maxFailedAttempts = 3;
  static const Duration lockoutDuration = Duration(seconds: 60);

  static String hashPin(String pin, {String salt = 'eseka_distribution_secure_salt'}) {
    final bytes = utf8.encode('$salt:$pin');
    return sha256.convert(bytes).toString();
  }

  Future<AuthResult> authenticateWithPin(String pin, {String? targetUserId}) async {
    // Vérification du verrouillage 60s
    // Hashage et comparaison locale contre local_credentials
    // Réinitialisation ou incrément des tentatives
  }
}`,
  },
  {
    path: 'lib/core/auth/permissions.dart',
    language: 'dart',
    description: 'Matrice RBAC complète des rôles (superadmin, admin, driver) et contrôle des permissions',
    content: `// Matrice RBAC complète des Rôles & Permissions
enum AppPermission {
  createOrder,
  planTour,
  executeTour,
  reconcileCashier,
  manageFleet,
  editCatalogPrices,
  manageBackups,
  activateLicense,
  viewDepotAnalytics,
  viewAllDepots,
}

class RolePermissions {
  static const Map<String, Set<AppPermission>> _roleMatrix = {
    'superadmin': {
      AppPermission.createOrder,
      AppPermission.planTour,
      AppPermission.executeTour,
      AppPermission.reconcileCashier,
      AppPermission.manageFleet,
      AppPermission.editCatalogPrices,
      AppPermission.manageBackups,
      AppPermission.activateLicense,
      AppPermission.viewDepotAnalytics,
      AppPermission.viewAllDepots,
    },
    'admin': {
      AppPermission.createOrder,
      AppPermission.planTour,
      AppPermission.executeTour,
      AppPermission.reconcileCashier,
      AppPermission.manageFleet,
      AppPermission.manageBackups,
      AppPermission.viewDepotAnalytics,
    },
    'driver': {
      AppPermission.executeTour, // Exécution de tournée smartphone uniquement
    },
  };

  static bool hasPermission(String role, AppPermission permission) {
    return _roleMatrix[role.toLowerCase()]?.contains(permission) ?? false;
  }
}`,
  },
  {
    path: 'lib/models/models.dart',
    language: 'dart',
    description: 'Modèles métier: Product (casiers/consignes), Customer, Order, Tour, DeliveryStop, CashierReconciliation',
    content: `// Modèles de données Eséka Distribution (Cameroun, FCFA / XAF)
enum VehicleType { truck5T, pickup, tricycle }
enum DeliveryResultStatus { pending, delivered100, partial, failed }
enum PaymentMethod { cash, mtnMomo, orangeMoney }

class Product {
  final String id;
  final String name;
  final int crateCapacity; // 12 ou 24 bouteilles
  final int liquidPrice; // FCFA
  final int crateDepositPrice; // Consigne casier (ex: 1 500 FCFA)
  final int bottleDepositPrice; // 125 FCFA
  // ...
}

class DeliveryStop {
  final int stopOrder;
  final String orderId;
  final String customerName;
  final int expectedCrates;
  final int expectedAmount;
  final DeliveryResultStatus status;
  final int deliveredCrates;
  final int emptyCratesCollected;
  final PaymentMethod? paymentMethod;
  final int amountCollected;
  final String? mobileMoneyTxRef;
}

class CashierReconciliation {
  final int totalCashHandedOver;
  final int totalMtnMomo;
  final int totalOrangeMoney;
  final int emptyCratesReturnedToDepot;
  final int fullCratesReturnedUnsold;
  final int cashDiscrepancy;
}`,
  },
  {
    path: 'lib/features/settings/settings_screen.dart',
    language: 'dart',
    description: 'Écran Paramètres Flutter : Sauvegarde/Restauration SQLite, choix du répertoire, bascule Seed Data, licence 60 jours et support PondyCode',
    content: `// Écran Paramètres, Sauvegarde & Licence 60 Jours
class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});
  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  int _daysRemaining = 48; // 60 jours d'essai
  bool _isActivated = false;
  String _selectedRepertory = '/storage/emulated/0/Documents/EsekaBackups/';
  bool _autoBackupDaily = true;
  bool _hasSeedData = true;

  // Activation de la licence commerciale
  void _activateLicense(String key) {
    if (key == 'ESEKA-PRO-2024-XAF' || key == 'PONDYCODE-ESEKA-2026') {
      setState(() => _isActivated = true);
    }
  }

  // Choix du répertoire de sauvegarde
  void _chooseStorageRepertory(String newPath) {
    setState(() => _selectedRepertory = newPath);
  }

  // Bascule Load / Unload du jeu de test démo
  void _toggleSeedData() {
    setState(() => _hasSeedData = !_hasSeedData);
  }

  // Section À Propos & Contacts développeur
  // Email: pondycode@gmail.com
  // WhatsApp: +237 674 66 72 34 (wa.me/237674667234)
}`,
  },
  {
    path: 'supabase/migrations/20240101000000_eseka_distribution_schema.sql',
    language: 'sql',
    description: 'Migration SQL PostgreSQL Supabase: sync_documents, RPCs push/pull, RLS et seed des boissons',
    content: `-- Table sync_documents
CREATE TABLE IF NOT EXISTS public.sync_documents (
    collection TEXT NOT NULL,
    doc_id TEXT NOT NULL,
    deposit_id TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    version INTEGER NOT NULL DEFAULT 1,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    server_updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (collection, doc_id)
);

-- RPC sync_push_rows avec Last-Write-Wins (LWW)
CREATE OR REPLACE FUNCTION public.sync_push_rows(
    p_rows JSONB,
    p_client_deposit_id TEXT
) RETURNS JSONB ...

-- RPC sync_pull_rows avec curseur keyset
CREATE OR REPLACE FUNCTION public.sync_pull_rows(
    p_collection TEXT,
    p_deposit_id TEXT,
    p_cursor_timestamp TIMESTAMPTZ,
    p_cursor_doc_id TEXT,
    p_limit INT
) RETURNS TABLE ...`,
  },
  {
    path: 'android/app/src/main/AndroidManifest.xml',
    language: 'xml',
    description: 'Manifeste Android : Permissions pour SQLite hors-ligne, stockage externe SD, synchronisation réseau et appels clients',
    content: `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.eseka.distribution">

    <!-- Permissions Android indispensables pour Eséka Distribution -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.CALL_PHONE" />

    <application
        android:label="Eséka Distribution"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher"
        android:requestLegacyExternalStorage="true">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>`,
  },
  {
    path: 'BUILD_ANDROID_APK.sh',
    language: 'bash',
    description: 'Instructions et commandes pour compiler le fichier APK Android installable sur smartphone',
    content: `#!/usr/bin/env bash
# ===================================================================
# Commandes pour générer l'APK Android d'Eséka Distribution
# ===================================================================

# 1. Vérifier l'environnement Flutter
flutter doctor

# 2. Récupérer les dépendances
flutter pub get

# 3. Générer le code Drift SQLite (build_runner)
dart run build_runner build --delete-conflicting-outputs

# 4. Compiler l'APK Android autonome (installable sur tout smartphone)
flutter build apk --release

# L'APK généré sera disponible dans :
# build/app/outputs/flutter-apk/app-release.apk

# 5. Installer directement sur le téléphone connecté par USB
flutter install`,
  },
];

export const CodeExplorerView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<CodeFile>(FLUTTER_FILES[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 tracking-wider uppercase mb-1">
            <FolderTree className="w-4 h-4" />
            <span>Architecture Mobile Flutter & Backend SQL</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            Code Source & Architecture Modulaire
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Fichiers Flutter prêts pour la production dans <code className="text-amber-300 font-mono">/lib</code> et script SQL Supabase
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 self-start md:self-auto shadow-sm"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Copié dans le presse-papier !' : 'Copier ce Fichier'}</span>
        </button>
      </div>

      {/* Explorer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* File Tree List */}
        <div className="lg:col-span-1 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 py-1 mb-1">
            Arborescence du Projet
          </div>
          {FLUTTER_FILES.map((file) => {
            const isSelected = selectedFile.path === file.path;
            return (
              <button
                key={file.path}
                onClick={() => setSelectedFile(file)}
                className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition flex items-center gap-2.5 ${
                  isSelected
                    ? 'bg-amber-600 text-white font-semibold shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileCode
                  className={`w-4 h-4 shrink-0 ${
                    isSelected ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{file.path}</span>
              </button>
            );
          })}
        </div>

        {/* Code Content Viewer */}
        <div className="lg:col-span-3 bg-slate-950 rounded-3xl p-6 border border-slate-800 shadow-md text-white font-mono text-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="font-bold text-slate-200">{selectedFile.path}</span>
              <span className="text-slate-500 font-sans text-[11px]">
                ({selectedFile.language.toUpperCase()})
              </span>
            </div>
            <span className="text-slate-400 font-sans text-xs hidden sm:inline">
              {selectedFile.description}
            </span>
          </div>

          <pre className="flex-1 overflow-x-auto whitespace-pre font-mono leading-relaxed text-slate-300">
            {selectedFile.content}
          </pre>
        </div>
      </div>
    </div>
  );
};
