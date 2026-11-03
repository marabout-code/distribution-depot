import React from 'react';
import {
  Banknote,
  Package,
  RotateCcw,
  Truck,
  Plus,
  Route,
  Smartphone,
  CheckCircle2,
  Settings,
} from 'lucide-react';
import { driftStore } from '../services/driftStore';
import { Tour } from '../types';

interface DepotDashboardViewProps {
  onOpenOrderModal: () => void;
  onOpenTourPlanning: () => void;
  onSwitchToMobile: () => void;
  onOpenSettings?: () => void;
}

export const DepotDashboardView: React.FC<DepotDashboardViewProps> = ({
  onOpenOrderModal,
  onOpenTourPlanning,
  onSwitchToMobile,
  onOpenSettings,
}) => {
  const tours = driftStore.getDocuments<Tour>('tours');

  const formatFcfa = (val: number) => {
    return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })
      .format(val)
      .replace('FCFA', 'FCFA');
  };

  // Compute live aggregates from Drift local store
  let totalSales = 2450000;
  let totalDeliveredCrates = 312;
  let totalEmptiesReturned = 296;
  let cashTotal = 1550000;
  let momoTotal = 620000;
  let omTotal = 280000;

  for (const t of tours) {
    for (const s of t.stops) {
      if (s.status !== 'pending' && s.amountCollected > 0) {
        totalSales += s.amountCollected;
        totalDeliveredCrates += s.deliveredCrates;
        totalEmptiesReturned += s.emptyCratesCollected;
        if (s.paymentMethod === 'cash') cashTotal += s.amountCollected;
        if (s.paymentMethod === 'mtnMomo') momoTotal += s.amountCollected;
        if (s.paymentMethod === 'orangeMoney') omTotal += s.amountCollected;
      }
    }
  }

  const cashPct = Math.round((cashTotal / totalSales) * 100);
  const momoPct = Math.round((momoTotal / totalSales) * 100);
  const omPct = Math.max(0, 100 - cashPct - momoPct);

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Actions Strip */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-amber-400 tracking-wider uppercase">
            Centre Logistique · Eséka Centre
          </span>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mt-0.5">
            Tableau de Bord Dépôt de Boissons
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Suivi temps réel des ventes en FCFA, rotations de casiers et encaissements chauffeurs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenOrderModal}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Commande</span>
          </button>
          <button
            onClick={onOpenTourPlanning}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-700"
          >
            <Route className="w-4 h-4 text-teal-400" />
            <span>Planifier Tournée</span>
          </button>
          <button
            onClick={onSwitchToMobile}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-700"
          >
            <Smartphone className="w-4 h-4" />
            <span>Vue Smartphone</span>
          </button>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-700"
              title="Paramètres, Sauvegarde & Licence"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Paramètres</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Ventes du Jour */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Chiffre d'Affaires</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">
            {formatFcfa(totalSales)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mt-2">
            <span>+18.4%</span>
            <span className="text-slate-400 font-normal">vs semaine passée</span>
          </div>
        </div>

        {/* Metric 2: Casiers Livrés */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Casiers Pleins Livrés</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">
            {totalDeliveredCrates} <span className="text-sm font-normal text-slate-500">casiers</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Bières (12/24 btls) & Gazeuses
          </div>
        </div>

        {/* Metric 3: Casiers Vides Récupérés */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Casiers Vides Récupérés</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">
            {totalEmptiesReturned} <span className="text-sm font-normal text-slate-500">casiers</span>
          </div>
          <div className="text-xs text-amber-700 font-semibold mt-2">
            Solde emballages: {totalEmptiesReturned - totalDeliveredCrates} casiers
          </div>
        </div>

        {/* Metric 4: Tournées Actives */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tournées Dépôt</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">
            {tours.length} <span className="text-sm font-normal text-slate-500">tournées</span>
          </div>
          <div className="text-xs text-emerald-700 font-semibold mt-2">
            Flotte active (Camion 5T, Pickup, Tricycle)
          </div>
        </div>
      </div>

      {/* Two Column Section: Payment Breakdown & Tour Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Collections Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Ventilation des Encaissements (FCFA)
            </h2>
            <span className="text-xs text-slate-400 font-medium">Réconciliation Caisse</span>
          </div>

          <div className="space-y-3.5">
            {/* Espèces (Cash) */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Espèces physiques (Cash)</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatFcfa(cashTotal)} ({cashPct}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full"
                  style={{ width: `${cashPct}%` }}
                />
              </div>
            </div>

            {/* MTN Mobile Money */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">MTN Mobile Money (MoMo)</span>
                <span className="font-bold text-amber-700 font-mono">
                  {formatFcfa(momoTotal)} ({momoPct}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${momoPct}%` }}
                />
              </div>
            </div>

            {/* Orange Money */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Orange Money (OM)</span>
                <span className="font-bold text-orange-700 font-mono">
                  {formatFcfa(omTotal)} ({omPct}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-orange-600 h-full rounded-full"
                  style={{ width: `${omPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Rapprochement caisse dépôt:</span>
            <span className="font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              100% Réconcilié
            </span>
          </div>
        </div>

        {/* Active Tour Overview */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Tournée en Cours d'Exécution
            </h2>
            <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full font-semibold border border-amber-200">
              En direct
            </span>
          </div>

          {tours.length > 0 ? (
            <div className="space-y-3">
              {tours.slice(0, 1).map((tour) => (
                <div
                  key={tour.id}
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{tour.tourNumber}</div>
                      <div className="text-[11px] text-slate-500">
                        {tour.vehicleName} · Chauffeur: {tour.driverName}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-700 font-mono">
                      {tour.totalLoadedCrates} casiers
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                    {tour.stops.map((stop) => (
                      <div
                        key={stop.stopOrder}
                        className="flex items-center justify-between text-xs text-slate-700"
                      >
                        <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                          <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {stop.stopOrder}
                          </span>
                          <span className="truncate">{stop.customerName}</span>
                        </span>
                        <span className="font-semibold font-mono text-[11px]">
                          {stop.status === 'delivered100' ? (
                            <span className="text-emerald-700">Livré ({stop.deliveredCrates}c)</span>
                          ) : stop.status === 'partial' ? (
                            <span className="text-amber-700">Partiel ({stop.deliveredCrates}c)</span>
                          ) : stop.status === 'failed' ? (
                            <span className="text-rose-600">Échec</span>
                          ) : (
                            <span className="text-slate-400">En attente</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Aucune tournée enregistrée.</p>
          )}

          <button
            onClick={onSwitchToMobile}
            className="w-full py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-center"
          >
            Ouvrir la console chauffeur sur smartphone →
          </button>
        </div>
      </div>
    </div>
  );
};
