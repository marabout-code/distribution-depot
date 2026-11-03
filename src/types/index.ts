export type UserRole = 'superadmin' | 'admin' | 'driver';

export type Permission =
  | 'create_order'
  | 'plan_tour'
  | 'execute_tour'
  | 'reconcile_cashier'
  | 'manage_fleet'
  | 'edit_catalog_prices'
  | 'manage_backups'
  | 'activate_license'
  | 'view_depot_analytics'
  | 'view_all_depots';

export interface RoleCapability {
  role: UserRole;
  label: string;
  description: string;
  permissions: Permission[];
}

export interface AuthUser {
  userId: string;
  userName: string;
  role: UserRole;
  depositId: string | null;
}

export type VehicleType = 'truck5T' | 'pickup' | 'tricycle';

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  type: VehicleType;
  maxCrates: number;
  maxWeightKg: number;
  assignedDriverId: string;
  status: 'AVAILABLE' | 'ON_TOUR' | 'MAINTENANCE';
}

export interface Product {
  id: string;
  name: string;
  category: string;
  crateCapacity: number; // e.g. 12 or 24 bottles per crate
  liquidPrice: number; // FCFA for liquid only
  crateDepositPrice: number; // e.g. 1500 FCFA for empty crate
  bottleDepositPrice: number; // e.g. 125 FCFA per bottle
  totalCratePrice: number;
  barcode: string;
  sku: string;
}

export interface Customer {
  id: string;
  name: string;
  type: 'BAR' | 'CAVE' | 'SNACK' | 'DEPOT';
  ownerName: string;
  phone: string;
  quarter: string; // e.g. "Quartier Gare", "Marché Central"
  emptyCratesBalance: number; // negative = owes empty crates to depot
  gps?: { lat: number; lng: number };
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantityCrates: number;
  unitLiquidPrice: number;
  unitDepositPrice: number;
  chargeDeposit: boolean;
}

export type OrderStatus = 'pending' | 'planned' | 'inDelivery' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  quarter: string;
  depositId: string;
  items: OrderItem[];
  totalLiquidAmount: number;
  totalDepositAmount: number;
  totalAmount: number;
  totalCrates: number;
  status: OrderStatus;
  createdAt: string;
}

export type DeliveryResultStatus = 'pending' | 'delivered100' | 'partial' | 'failed';
export type PaymentMethod = 'cash' | 'mtnMomo' | 'orangeMoney';

export interface DeliveryStop {
  stopOrder: number;
  orderId: string;
  customerName: string;
  customerPhone: string;
  quarter: string;
  expectedCrates: number;
  expectedAmount: number;
  status: DeliveryResultStatus;
  deliveredCrates: number;
  emptyCratesCollected: number;
  paymentMethod?: PaymentMethod;
  amountCollected: number;
  mobileMoneyTxRef?: string;
  failureReason?: string;
  completedAt?: string;
}

export type TourStatus = 'planned' | 'inProgress' | 'closed' | 'reconciled';

export interface CashierReconciliation {
  totalCashHandedOver: number;
  totalMtnMomo: number;
  totalOrangeMoney: number;
  emptyCratesReturnedToDepot: number;
  fullCratesReturnedUnsold: number;
  cashDiscrepancy: number;
  cratesDiscrepancy: number;
  cashierUserId: string;
  cashierName: string;
  reconciledAt: string;
}

export interface Tour {
  id: string;
  tourNumber: string;
  depositId: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleName: string;
  vehicleType: VehicleType;
  stops: DeliveryStop[];
  status: TourStatus;
  totalLoadedCrates: number;
  startedAt: string;
  closedAt?: string;
  reconciliation?: CashierReconciliation;
}

// Drift SQLite local database types
export interface DriftDocumentRow {
  collection: string;
  docId: string;
  depositId: string | null;
  payload: any;
  version: number;
  localUpdatedAt: string;
  dirty: boolean;
  deleted: boolean;
}

export interface LocalCredential {
  userId: string;
  userName: string;
  role: UserRole;
  depositId: string | null;
  pinHash: string;
  lastLoginAt: string | null;
}

export interface LocalAttempt {
  key: string;
  failedAttempts: number;
  lockoutUntil: string | null;
  lastAttemptAt: string;
}

export interface SyncState {
  collection: string;
  lastServerUpdatedAt: string;
  lastDocId: string;
}

export type NetworkStatus = 'online' | 'offline' | 'slow';

export interface TrialLicenseInfo {
  machineId: string; // Unique hardware/installation token e.g. ESK-8F2A-4D91
  installedAt: string; // ISO date
  trialDaysTotal: number; // 60 days
  isActivated: boolean;
  licenseKey?: string;
  activatedTo?: string;
  daysRemaining: number;
  isExpired: boolean;
}

export interface BackupSettings {
  storageRepertory: string; // Custom directory path
  autoBackupDaily: boolean;
  lastBackupAt: string | null;
  backupCount: number;
}
