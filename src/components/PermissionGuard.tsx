import React from 'react';
import { ShieldAlert, Key, Check, X, ArrowRight, UserCheck } from 'lucide-react';
import { AuthUser, Permission } from '../types';
import { ROLE_CAPABILITIES, driftStore } from '../services/driftStore';

interface PermissionGuardProps {
  currentUser: AuthUser | null;
  requiredPermission: Permission;
  children: React.ReactNode;
  onSwitchUser?: (newUser: AuthUser) => void;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  currentUser,
  requiredPermission,
  children,
  onSwitchUser,
}) => {
  const userRole = currentUser?.role;
  const userCaps = userRole ? ROLE_CAPABILITIES[userRole] : null;
  const hasAccess = userCaps?.permissions.includes(requiredPermission) ?? false;

  if (hasAccess) {
    return <>{children}</>;
  }

  // Permission Denied View with Role Switcher & Matrix
  const handleQuickSwitch = (pin: string) => {
    const res = driftStore.verifyPin(pin);
    if (res.success && res.user && onSwitchUser) {
      onSwitchUser(res.user);
    }
  };

  const permissionLabels: Record<Permission, string> = {
    create_order: 'Créer des commandes clients et consigner des casiers',
    plan_tour: 'Planifier des tournées, affecter véhicules et chauffeurs',
    execute_tour: 'Exécuter la tournée sur smartphone et encaisser',
    reconcile_cashier: 'Effectuer la réconciliation de caisse en fin de journée',
    manage_fleet: 'Gérer la flotte (Camions 5T, Pickups, Tricycles)',
    edit_catalog_prices: 'Modifier les prix des boissons et consignes',
    manage_backups: 'Exporter et restaurer les sauvegardes SQLite',
    activate_license: 'Activer la licence commerciale du dépôt',
    view_depot_analytics: 'Consulter le chiffre d\'affaires et les indicateurs financiers',
    view_all_depots: 'Consulter et auditer tous les dépôts (multi-dépôts)',
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div>
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block mb-1">
            Contrôle d'Accès par Rôle (RBAC)
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Permission Requise Non Accordée
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            L'action demandée (<strong>{permissionLabels[requiredPermission]}</strong>) n'est pas autorisée pour votre rôle actuel.
          </p>
        </div>

        {/* Current User Role Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-xs text-slate-700 font-medium">
          <UserCheck className="w-3.5 h-3.5 text-slate-500" />
          <span>Connecté en tant que : <strong>{currentUser?.userName}</strong> ({currentUser?.role.toUpperCase()})</span>
        </div>

        {/* Quick Switch to Admin or Superadmin */}
        <div className="pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-600 font-semibold block mb-2">
            Bascule rapide vers un compte habilité (Démo) :
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => handleQuickSwitch('2222')}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Chef Dépôt (Admin · PIN: 2222)</span>
            </button>
            <button
              onClick={() => handleQuickSwitch('1111')}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Directeur Général (Superadmin · PIN: 1111)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Role Capabilities Matrix */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">
          Matrice des Rôles & Droits d'Accès d'Eséka Distribution
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Fonctionnalité / Action</th>
                <th className="py-2.5 px-2 text-center text-emerald-800">Superadmin</th>
                <th className="py-2.5 px-2 text-center text-amber-800">Admin Dépôt</th>
                <th className="py-2.5 px-2 text-center text-slate-700">Chauffeur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(Object.keys(permissionLabels) as Permission[]).map((p) => {
                const superHas = ROLE_CAPABILITIES.superadmin.permissions.includes(p);
                const adminHas = ROLE_CAPABILITIES.admin.permissions.includes(p);
                const driverHas = ROLE_CAPABILITIES.driver.permissions.includes(p);

                return (
                  <tr key={p} className={requiredPermission === p ? 'bg-amber-50/50 font-semibold' : ''}>
                    <td className="py-2.5 px-3 text-slate-700">{permissionLabels[p]}</td>
                    <td className="py-2.5 px-2 text-center">
                      {superHas ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {adminHas ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {driverHas ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
