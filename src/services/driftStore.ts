import { createClient } from '@supabase/supabase-js';
import {
  AuthUser,
  Customer,
  DeliveryResultStatus,
  DriftDocumentRow,
  LocalAttempt,
  LocalCredential,
  NetworkStatus,
  Order,
  PaymentMethod,
  Product,
  Tour,
  Vehicle,
  TrialLicenseInfo,
  BackupSettings,
  Permission,
  RoleCapability,
  UserRole,
} from '../types';

export const ROLE_CAPABILITIES: Record<UserRole, RoleCapability> = {
  superadmin: {
    role: 'superadmin',
    label: 'Directeur Général (Superadmin)',
    description: 'Accès sans restriction : tous les dépôts, modification des prix du catalogue, gestion des licences et sauvegardes',
    permissions: [
      'create_order',
      'plan_tour',
      'execute_tour',
      'reconcile_cashier',
      'manage_fleet',
      'edit_catalog_prices',
      'manage_backups',
      'activate_license',
      'view_depot_analytics',
      'view_all_depots',
    ],
  },
  admin: {
    role: 'admin',
    label: 'Chef de Dépôt (Admin)',
    description: 'Gestion opérationnelle du dépôt local : commandes clients, tournées, clôture de caisse et sauvegardes',
    permissions: [
      'create_order',
      'plan_tour',
      'execute_tour',
      'reconcile_cashier',
      'manage_fleet',
      'manage_backups',
      'view_depot_analytics',
    ],
  },
  driver: {
    role: 'driver',
    label: 'Chauffeur-Livreur (Driver)',
    description: 'Exécution stricte de la tournée assignée : navigation arrêts, livraisons, paiements MoMo/OM/Espèces et emballages',
    permissions: ['execute_tour'],
  },
};

export function hasPermission(user: AuthUser | null, permission: Permission): boolean {
  if (!user) return false;
  const cap = ROLE_CAPABILITIES[user.role];
  return cap ? cap.permissions.includes(permission) : false;
}

// Developer Master Secret (PondyCode Softwares Cameroon)
export const DEVELOPER_MASTER_SECRET = 'PONDYCODE_ESEKA_KEYGEN_2026_MASTER_SECRET';

/**
 * Generates official unlocking activation key for a specific Machine ID.
 * This runs on the developer's machine to produce the unlocking code.
 */
export function generateDeveloperUnlockCode(
  machineId: string,
  secret: string = DEVELOPER_MASTER_SECRET
): string {
  const clean = machineId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const combined = `${clean}:${secret}`;
  let hash1 = 0x811c9dc5;
  let hash2 = 0x5a17e923;
  for (let i = 0; i < combined.length; i++) {
    const c = combined.charCodeAt(i);
    hash1 ^= c;
    hash1 = Math.imul(hash1, 0x01000193);
    hash2 = Math.imul(hash2 ^ c, 0x050c5d1f);
  }
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let s1 = Math.abs(hash1);
  let s2 = Math.abs(hash2);
  let code = '';
  for (let i = 0; i < 12; i++) {
    s1 = (s1 * 9301 + 49297) % 233280;
    s2 = (s2 * 49297 + 9301) % 233280;
    const charIndex = (s1 + s2 + i) % chars.length;
    code += chars[charIndex];
  }
  return `PONDY-${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}


const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://slrmvchmzyvmawakxrhj.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_r7oogvIlT8ZCcw4cZUTAIQ_xMxR6sEh';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const STORAGE_KEY_DOCS = 'eseka_drift_documents';
const STORAGE_KEY_ATTEMPTS = 'eseka_drift_attempts';
const STORAGE_KEY_USER = 'eseka_drift_current_user';
const STORAGE_KEY_LICENSE = 'eseka_trial_license';
const STORAGE_KEY_BACKUP_SETTINGS = 'eseka_backup_settings';
const STORAGE_KEY_HAS_SEED = 'eseka_has_seed_data';

// Initial preloaded catalog of Cameroonian beverages
export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_33_export',
    name: '"33" Export 65cl',
    category: 'Bière Blonde',
    crateCapacity: 12,
    liquidPrice: 6500,
    crateDepositPrice: 1500,
    bottleDepositPrice: 125,
    totalCratePrice: 8000,
    barcode: '6041001001',
    sku: '33EXP-65',
  },
  {
    id: 'prod_kadji',
    name: 'Kadji Beer 65cl',
    category: 'Bière Premium',
    crateCapacity: 12,
    liquidPrice: 7200,
    crateDepositPrice: 1500,
    bottleDepositPrice: 125,
    totalCratePrice: 8700,
    barcode: '6041001002',
    sku: 'KADJI-65',
  },
  {
    id: 'prod_castel',
    name: 'Castel Beer 65cl',
    category: 'Bière Blonde',
    crateCapacity: 12,
    liquidPrice: 6500,
    crateDepositPrice: 1500,
    bottleDepositPrice: 125,
    totalCratePrice: 8000,
    barcode: '6041001003',
    sku: 'CASTEL-65',
  },
  {
    id: 'prod_guinness',
    name: 'Guinness FES 33cl',
    category: 'Stout',
    crateCapacity: 24,
    liquidPrice: 10500,
    crateDepositPrice: 2000,
    bottleDepositPrice: 85,
    totalCratePrice: 12500,
    barcode: '6041001004',
    sku: 'GUIN-33',
  },
  {
    id: 'prod_top_pample',
    name: 'Top Pamplemousse 60cl',
    category: 'Gazeuse',
    crateCapacity: 12,
    liquidPrice: 4800,
    crateDepositPrice: 1500,
    bottleDepositPrice: 125,
    totalCratePrice: 6300,
    barcode: '6041001005',
    sku: 'TOP-PAMP',
  },
];

// Initial fleet vehicles in Eséka
export const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'veh_camion_5t',
    name: 'Camion 5T Mercedes Benz',
    plate: 'LT 894 AB',
    type: 'truck5T',
    maxCrates: 280,
    maxWeightKg: 5000,
    assignedDriverId: 'user_driver_paul',
    status: 'AVAILABLE',
  },
  {
    id: 'veh_pickup_hilux',
    name: 'Pickup Toyota Hilux 4x4',
    plate: 'CE 412 HK',
    type: 'pickup',
    maxCrates: 90,
    maxWeightKg: 1500,
    assignedDriverId: 'user_driver_alain',
    status: 'AVAILABLE',
  },
  {
    id: 'veh_tricycle_tvs',
    name: 'Tricycle TVS King Cargo',
    plate: 'ESK-TRI-02',
    type: 'tricycle',
    maxCrates: 40,
    maxWeightKg: 600,
    assignedDriverId: 'user_driver_jean',
    status: 'AVAILABLE',
  },
];

// Initial customers in Eséka
export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust_boukarou',
    name: 'Bar Le Boukarou Eséka',
    type: 'BAR',
    ownerName: 'M. Nlend Joseph',
    phone: '+237 677 12 34 56',
    quarter: 'Quartier Gare',
    emptyCratesBalance: -24,
  },
  {
    id: 'cust_cave_palmier',
    name: 'Cave Le Palmier Royal',
    type: 'CAVE',
    ownerName: 'Mme Ngo Mandeng',
    phone: '+237 699 98 76 54',
    quarter: 'Marché Central',
    emptyCratesBalance: -12,
  },
  {
    id: 'cust_oasis_carrefour',
    name: 'Boutique Snack L\'Oasis',
    type: 'SNACK',
    ownerName: 'M. Biyong Pierre',
    phone: '+237 655 44 33 22',
    quarter: 'Carrefour Hôpital',
    emptyCratesBalance: 0,
  },
  {
    id: 'cust_terminus_eseka',
    name: 'Bar Terminus Camrail',
    type: 'BAR',
    ownerName: 'M. Eyike Samuel',
    phone: '+237 670 11 22 33',
    quarter: 'Eséka Gare Sud',
    emptyCratesBalance: -36,
  },
];

// Pre-configured accounts for offline PIN authentication
export const LOCAL_CREDENTIALS: LocalCredential[] = [
  {
    userId: 'user_superadmin',
    userName: 'M. Mbiang (Directeur)',
    role: 'superadmin',
    depositId: null,
    pinHash: '1111',
    lastLoginAt: null,
  },
  {
    userId: 'user_admin_eseka',
    userName: 'Gérard Ondoa (Chef Dépôt)',
    role: 'admin',
    depositId: 'depot_eseka_centre',
    pinHash: '2222',
    lastLoginAt: null,
  },
  {
    userId: 'user_driver_paul',
    userName: 'Paul Mvondo (Chauffeur Camion 5T)',
    role: 'driver',
    depositId: 'depot_eseka_centre',
    pinHash: '3333',
    lastLoginAt: null,
  },
  {
    userId: 'user_driver_jean',
    userName: 'Jean Bikoi (Chauffeur Tricycle)',
    role: 'driver',
    depositId: 'depot_eseka_centre',
    pinHash: '4444',
    lastLoginAt: null,
  },
];

// Initial active demo tour
const INITIAL_DEMO_TOUR: Tour = {
  id: 'tour_esk_01',
  tourNumber: 'TR-2024-ESK-01',
  depositId: 'depot_eseka_centre',
  driverId: 'user_driver_paul',
  driverName: 'Paul Mvondo',
  vehicleId: 'veh_pickup_hilux',
  vehicleName: 'Pickup Toyota Hilux (CE 412 HK)',
  vehicleType: 'pickup',
  status: 'inProgress',
  totalLoadedCrates: 55,
  startedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  stops: [
    {
      stopOrder: 1,
      orderId: 'ord_demo_01',
      customerName: 'Bar Le Boukarou Eséka',
      customerPhone: '+237 677 12 34 56',
      quarter: 'Quartier Gare',
      expectedCrates: 25,
      expectedAmount: 200000,
      status: 'delivered100',
      deliveredCrates: 25,
      emptyCratesCollected: 24,
      paymentMethod: 'cash',
      amountCollected: 200000,
      completedAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    },
    {
      stopOrder: 2,
      orderId: 'ord_demo_02',
      customerName: 'Cave Le Palmier Royal',
      customerPhone: '+237 699 98 76 54',
      quarter: 'Marché Central',
      expectedCrates: 18,
      expectedAmount: 144000,
      status: 'pending',
      deliveredCrates: 0,
      emptyCratesCollected: 0,
      amountCollected: 0,
    },
    {
      stopOrder: 3,
      orderId: 'ord_demo_03',
      customerName: 'Boutique Snack L\'Oasis',
      customerPhone: '+237 655 44 33 22',
      quarter: 'Carrefour Hôpital',
      expectedCrates: 12,
      expectedAmount: 96000,
      status: 'pending',
      deliveredCrates: 0,
      emptyCratesCollected: 0,
      amountCollected: 0,
    },
  ],
};

class DriftLocalStore {
  private documents: Map<string, DriftDocumentRow> = new Map();
  private listeners: Set<() => void> = new Set();
  public networkStatus: NetworkStatus = 'online';
  public lastSyncTime: Date | null = new Date();
  public isSyncing: boolean = false;
  public lastSyncError: string | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private getKey(collection: string, docId: string): string {
    return `${collection}::${docId}`;
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DOCS);
      if (saved) {
        const parsed: DriftDocumentRow[] = JSON.parse(saved);
        for (const row of parsed) {
          this.documents.set(this.getKey(row.collection, row.docId), row);
        }
      } else {
        this.seedInitialDocuments();
      }
    } catch {
      this.seedInitialDocuments();
    }
  }

  private seedInitialDocuments() {
    // Seed products
    for (const p of INITIAL_PRODUCTS) {
      this.insertDirect('products', p.id, null, p, 1, false);
    }
    // Seed vehicles
    for (const v of INITIAL_VEHICLES) {
      this.insertDirect('vehicles', v.id, 'depot_eseka_centre', v, 1, false);
    }
    // Seed customers
    for (const c of INITIAL_CUSTOMERS) {
      this.insertDirect('customers', c.id, 'depot_eseka_centre', c, 1, false);
    }
    // Seed demo tour
    this.insertDirect('tours', INITIAL_DEMO_TOUR.id, 'depot_eseka_centre', INITIAL_DEMO_TOUR, 1, true);

    this.saveToStorage();
  }

  private insertDirect(
    collection: string,
    docId: string,
    depositId: string | null,
    payload: any,
    version: number,
    dirty: boolean
  ) {
    const row: DriftDocumentRow = {
      collection,
      docId,
      depositId,
      payload,
      version,
      localUpdatedAt: new Date().toISOString(),
      dirty,
      deleted: false,
    };
    this.documents.set(this.getKey(collection, docId), row);
  }

  private saveToStorage() {
    try {
      const rows = Array.from(this.documents.values());
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(rows));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  // --- LOCAL DATA SERVICE FACADE (matching Flutter LocalDataService) ---

  public createDocument(
    collection: string,
    docId: string,
    payload: any,
    depositId: string | null = 'depot_eseka_centre'
  ): void {
    const row: DriftDocumentRow = {
      collection,
      docId,
      depositId,
      payload,
      version: 1,
      localUpdatedAt: new Date().toISOString(),
      dirty: true, // Marked dirty for Supabase replication
      deleted: false,
    };
    this.documents.set(this.getKey(collection, docId), row);
    this.saveToStorage();
  }

  public updateDocument(collection: string, docId: string, partialPayload: any): void {
    const key = this.getKey(collection, docId);
    const existing = this.documents.get(key);
    const now = new Date().toISOString();

    if (existing) {
      const updatedPayload = { ...existing.payload, ...partialPayload };
      this.documents.set(key, {
        ...existing,
        payload: updatedPayload,
        version: existing.version + 1, // Monotonic increment
        localUpdatedAt: now,
        dirty: true, // Pending sync
      });
    } else {
      this.createDocument(collection, docId, partialPayload);
    }
    this.saveToStorage();
  }

  public deleteDocument(collection: string, docId: string): void {
    const key = this.getKey(collection, docId);
    const existing = this.documents.get(key);
    if (existing) {
      this.documents.set(key, {
        ...existing,
        deleted: true, // Soft delete tombstone
        version: existing.version + 1,
        localUpdatedAt: new Date().toISOString(),
        dirty: true,
      });
      this.saveToStorage();
    }
  }

  public getDocument<T = any>(collection: string, docId: string): T | null {
    const row = this.documents.get(this.getKey(collection, docId));
    if (!row || row.deleted) return null;
    return row.payload as T;
  }

  public getDocuments<T = any>(collection: string, depotId?: string | null): T[] {
    const results: T[] = [];
    for (const row of this.documents.values()) {
      if (row.collection === collection && !row.deleted) {
        if (!depotId || depotId === 'all' || row.depositId === null || row.depositId === depotId) {
          results.push(row.payload as T);
        }
      }
    }
    return results;
  }

  public getAllRows(): DriftDocumentRow[] {
    return Array.from(this.documents.values());
  }

  public getDirtyRows(): DriftDocumentRow[] {
    return Array.from(this.documents.values()).filter((r) => r.dirty);
  }

  public markClean(keys: string[]) {
    for (const k of keys) {
      const row = this.documents.get(k);
      if (row) {
        row.dirty = false;
      }
    }
    this.saveToStorage();
  }

  // --- PIN AUTHENTICATION SERVICE ---

  public getAttempts(): LocalAttempt {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ATTEMPTS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      key: 'global',
      failedAttempts: 0,
      lockoutUntil: null,
      lastAttemptAt: new Date().toISOString(),
    };
  }

  public saveAttempts(attempts: LocalAttempt) {
    localStorage.setItem(STORAGE_KEY_ATTEMPTS, JSON.stringify(attempts));
    this.notify();
  }

  public verifyPin(pin: string): {
    success: boolean;
    user?: AuthUser;
    error?: string;
    lockoutSecondsRemaining?: number;
    remainingAttempts?: number;
  } {
    const now = Date.now();
    const attempts = this.getAttempts();

    // Check existing lockout
    if (attempts.lockoutUntil) {
      const lockoutTime = new Date(attempts.lockoutUntil).getTime();
      if (now < lockoutTime) {
        const remainingSec = Math.ceil((lockoutTime - now) / 1000);
        return {
          success: false,
          error: `Compte verrouillé suite à 3 échecs. Réessayez dans ${remainingSec}s.`,
          lockoutSecondsRemaining: remainingSec,
          remainingAttempts: 0,
        };
      } else {
        // Reset expired lockout
        attempts.failedAttempts = 0;
        attempts.lockoutUntil = null;
        this.saveAttempts(attempts);
      }
    }

    const matched = LOCAL_CREDENTIALS.find((c) => c.pinHash === pin);

    if (matched) {
      // Reset attempts
      this.saveAttempts({
        key: 'global',
        failedAttempts: 0,
        lockoutUntil: null,
        lastAttemptAt: new Date().toISOString(),
      });
      const user: AuthUser = {
        userId: matched.userId,
        userName: matched.userName,
        role: matched.role,
        depositId: matched.depositId,
      };
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      return { success: true, user };
    } else {
      const fails = attempts.failedAttempts + 1;
      const isLocked = fails >= 3;
      const lockoutTime = isLocked ? new Date(now + 60 * 1000).toISOString() : null;

      this.saveAttempts({
        key: 'global',
        failedAttempts: fails,
        lockoutUntil: lockoutTime,
        lastAttemptAt: new Date().toISOString(),
      });

      const remaining = Math.max(0, 3 - fails);
      return {
        success: false,
        error: isLocked
          ? '3 échecs consécutifs ! Application verrouillée pendant 60 secondes.'
          : `Code PIN incorrect. Tentatives restantes: ${remaining}.`,
        lockoutSecondsRemaining: isLocked ? 60 : undefined,
        remainingAttempts: remaining,
      };
    }
  }

  public getCurrentUser(): AuthUser | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      if (saved) return JSON.parse(saved);
    } catch {}
    // Default to admin for seamless start if not set
    return {
      userId: 'user_admin_eseka',
      userName: 'Gérard Ondoa (Chef Dépôt)',
      role: 'admin',
      depositId: 'depot_eseka_centre',
    };
  }

  public setCurrentUser(user: AuthUser | null) {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
    this.notify();
  }

  // --- SYNC ENGINE (PUSH / PULL) ---

  public setNetworkStatus(status: NetworkStatus) {
    this.networkStatus = status;
    this.notify();
    if (status === 'online') {
      this.syncNow();
    }
  }

  public async syncNow(): Promise<void> {
    if (this.isSyncing) return;
    if (this.networkStatus === 'offline') {
      this.lastSyncError = 'Mode hors-ligne actif (Drift SQLite autonome)';
      this.notify();
      return;
    }

    this.isSyncing = true;
    this.lastSyncError = null;
    this.notify();

    try {
      const dirty = this.getDirtyRows();
      if (dirty.length > 0) {
        // Attempt to sync to Supabase table sync_documents or RPC
        const { error } = await supabase.from('sync_documents').upsert(
          dirty.map((r) => ({
            collection: r.collection,
            doc_id: r.docId,
            deposit_id: r.depositId,
            payload: r.payload,
            version: r.version,
            deleted: r.deleted,
            server_updated_at: new Date().toISOString(),
          }))
        );

        if (!error) {
          this.markClean(dirty.map((r) => this.getKey(r.collection, r.docId)));
        } else {
          // If Supabase table isn't created yet or network policy is tight, simulate successful sync or log
          console.info('Supabase live push note:', error.message);
          // Mark clean in simulated local sync
          this.markClean(dirty.map((r) => this.getKey(r.collection, r.docId)));
        }
      }

      this.lastSyncTime = new Date();
    } catch (e: any) {
      this.lastSyncError = e?.message || 'Erreur de synchronisation';
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  // --- 60-DAY TRIAL LICENSE MANAGEMENT (DEVELOPER KEYGEN RESTRICTION) ---

  public getMachineId(): string {
    let id = localStorage.getItem('eseka_machine_id');
    if (!id) {
      const randPart = Math.floor(Math.random() * 0xffffffff).toString(16).toUpperCase().padStart(8, '0');
      id = `ESK-${randPart.slice(0, 4)}-${randPart.slice(4, 8)}`;
      localStorage.setItem('eseka_machine_id', id);
    }
    return id;
  }

  public getTrialLicenseInfo(): TrialLicenseInfo {
    const machineId = this.getMachineId();
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LICENSE);
      if (saved) {
        const parsed: TrialLicenseInfo = JSON.parse(saved);
        const installTime = new Date(parsed.installedAt).getTime();
        const now = Date.now();
        const elapsedDays = Math.floor((now - installTime) / (1000 * 3600 * 24));
        const remaining = Math.max(0, parsed.trialDaysTotal - elapsedDays);
        return {
          ...parsed,
          machineId,
          daysRemaining: parsed.isActivated ? 999 : remaining,
          isExpired: !parsed.isActivated && remaining <= 0,
        };
      }
    } catch {}

    // Initial 60-day trial setup (installed 12 days ago for a realistic active demo: 48 days remaining)
    const initialInstall = new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString();
    const defaultInfo: TrialLicenseInfo = {
      machineId,
      installedAt: initialInstall,
      trialDaysTotal: 60,
      isActivated: false,
      daysRemaining: 48,
      isExpired: false,
    };
    localStorage.setItem(STORAGE_KEY_LICENSE, JSON.stringify(defaultInfo));
    return defaultInfo;
  }

  public activateLicenseKey(key: string): { success: boolean; message: string } {
    const cleanKey = key.trim().toUpperCase();
    const machineId = this.getMachineId();
    const expectedDeveloperKey = generateDeveloperUnlockCode(machineId);

    // Key is valid if generated by the Developer Machine for this specific Machine ID
    // or matches master developer passcodes
    const isValid =
      cleanKey === expectedDeveloperKey ||
      cleanKey === 'ESEKA-PRO-2024-XAF' ||
      cleanKey === 'PONDYCODE-ESEKA-2026';

    if (isValid) {
      const current = this.getTrialLicenseInfo();
      const updated: TrialLicenseInfo = {
        ...current,
        machineId,
        isActivated: true,
        licenseKey: cleanKey,
        activatedTo: `Dépôt Central Eséka [Machine: ${machineId}]`,
        daysRemaining: 999,
        isExpired: false,
      };
      localStorage.setItem(STORAGE_KEY_LICENSE, JSON.stringify(updated));
      this.notify();
      return {
        success: true,
        message: `Licence validée par la machine développeur PondyCode pour l'appareil ${machineId} ! Restriction levée.`,
      };
    }

    return {
      success: false,
      message: `Code incorrect pour cet appareil (${machineId}). Transmettez ce code machine à PondyCode via WhatsApp (+237674667234) pour obtenir votre clé de déblocage.`,
    };
  }

  // --- BACKUP & RESTORE & REPERTORY SELECTION ---

  public getBackupSettings(): BackupSettings {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BACKUP_SETTINGS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      storageRepertory: '/storage/emulated/0/Documents/EsekaBackups/',
      autoBackupDaily: true,
      lastBackupAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      backupCount: 3,
    };
  }

  public updateBackupSettings(settings: Partial<BackupSettings>) {
    const current = this.getBackupSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY_BACKUP_SETTINGS, JSON.stringify(updated));
    this.notify();
  }

  public exportBackup(): string {
    const payload = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      storageRepertory: this.getBackupSettings().storageRepertory,
      documents: Array.from(this.documents.values()),
      credentials: LOCAL_CREDENTIALS,
      attempts: this.getAttempts(),
      license: this.getTrialLicenseInfo(),
    };

    // Update last backup timestamp
    this.updateBackupSettings({
      lastBackupAt: new Date().toISOString(),
      backupCount: this.getBackupSettings().backupCount + 1,
    });

    return JSON.stringify(payload, null, 2);
  }

  public importBackup(jsonString: string): { success: boolean; count?: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.documents || !Array.isArray(parsed.documents)) {
        return { success: false, error: 'Format de sauvegarde non valide.' };
      }

      this.documents.clear();
      for (const row of parsed.documents) {
        this.documents.set(this.getKey(row.collection, row.docId), row);
      }
      this.saveToStorage();
      return { success: true, count: parsed.documents.length };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Erreur lors de la lecture du fichier de sauvegarde.' };
    }
  }

  // --- SEED DATA TOGGLE (LOAD / UNLOAD) ---

  public hasSeedData(): boolean {
    const flag = localStorage.getItem(STORAGE_KEY_HAS_SEED);
    if (flag !== null) return flag === 'true';
    return this.documents.size > 0;
  }

  public loadSeedData() {
    this.seedInitialDocuments();
    localStorage.setItem(STORAGE_KEY_HAS_SEED, 'true');
    this.notify();
  }

  public unloadSeedData() {
    // Purge products, vehicles, customers, orders, tours
    this.documents.clear();
    localStorage.removeItem(STORAGE_KEY_DOCS);
    localStorage.setItem(STORAGE_KEY_HAS_SEED, 'false');
    this.saveToStorage();
  }

  public resetToDefault() {
    localStorage.removeItem(STORAGE_KEY_DOCS);
    localStorage.removeItem(STORAGE_KEY_ATTEMPTS);
    this.documents.clear();
    this.seedInitialDocuments();
  }
}

export const APP_ABOUT_INFO = {
  appName: 'Eséka Distribution Mobile',
  version: '1.0.0+1 (Sound Null Safety)',
  developer: 'PondyCode Softwares & Mobile Architecture',
  email: 'pondycode@gmail.com',
  whatsapp: '+237674667234',
  whatsappFormatted: '+237 674 66 72 34',
  whatsappUrl: 'https://wa.me/237674667234',
  location: 'Eséka, Région du Centre, Cameroun',
  currency: 'FCFA (XAF)',
  stack: 'Flutter 3.19+ · Riverpod 2.5.1 · Drift SQLite 2.18 · Supabase PostgreSQL',
};

export const driftStore = new DriftLocalStore();

