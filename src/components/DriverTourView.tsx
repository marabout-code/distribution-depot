import React, { useState } from 'react';
import {
  Truck,
  CheckCircle2,
  Clock,
  Phone,
  AlertTriangle,
  Receipt,
  RotateCcw,
  ShieldCheck,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronRight,
  LogOut,
  Settings,
} from 'lucide-react';
import { driftStore } from '../services/driftStore';
import {
  AuthUser,
  CashierReconciliation,
  DeliveryResultStatus,
  DeliveryStop,
  PaymentMethod,
  Tour,
} from '../types';

interface DriverTourViewProps {
  currentUser: AuthUser;
  onLogout: () => void;
  onOpenOrderModal: () => void;
  onOpenSettings?: () => void;
}

export const DriverTourView: React.FC<DriverTourViewProps> = ({
  currentUser,
  onLogout,
  onOpenOrderModal,
  onOpenSettings,
}) => {
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [showReconcileModal, setShowReconcileModal] = useState(false);

  // Retrieve active tour from Drift store
  const tours = driftStore.getDocuments<Tour>('tours');
  const activeTour = tours.find((t) => t.status === 'inProgress') || tours[0];

  // Stop editing form state
  const currentStop: DeliveryStop | undefined = activeTour?.stops[activeStopIndex];

  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryResultStatus>(
    currentStop?.status === 'pending' ? 'delivered100' : currentStop?.status || 'delivered100'
  );
  const [deliveredCrates, setDeliveredCrates] = useState<number>(
    currentStop?.deliveredCrates || currentStop?.expectedCrates || 0
  );
  const [emptyCratesCollected, setEmptyCratesCollected] = useState<number>(
    currentStop?.emptyCratesCollected || currentStop?.expectedCrates || 0
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    currentStop?.paymentMethod || 'cash'
  );
  const [amountCollected, setAmountCollected] = useState<number>(
    currentStop?.amountCollected || currentStop?.expectedAmount || 0
  );
  const [txRef, setTxRef] = useState<string>(currentStop?.mobileMoneyTxRef || '');
  const [failureReason, setFailureReason] = useState<string>(currentStop?.failureReason || '');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const formatFcfa = (val: number) => {
    return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })
      .format(val)
      .replace('FCFA', 'FCFA');
  };

  const handleSelectStop = (index: number) => {
    setActiveStopIndex(index);
    const stop = activeTour?.stops[index];
    if (stop) {
      setDeliveryStatus(stop.status === 'pending' ? 'delivered100' : stop.status);
      setDeliveredCrates(stop.deliveredCrates > 0 ? stop.deliveredCrates : stop.expectedCrates);
      setEmptyCratesCollected(
        stop.emptyCratesCollected > 0 ? stop.emptyCratesCollected : stop.expectedCrates
      );
      setPaymentMethod(stop.paymentMethod || 'cash');
      setAmountCollected(stop.amountCollected > 0 ? stop.amountCollected : stop.expectedAmount);
      setTxRef(stop.mobileMoneyTxRef || '');
      setFailureReason(stop.failureReason || '');
    }
  };

  const handleSaveStop = () => {
    if (!activeTour || !currentStop) return;

    const updatedStops = activeTour.stops.map((s, idx) => {
      if (idx === activeStopIndex) {
        return {
          ...s,
          status: deliveryStatus,
          deliveredCrates: deliveryStatus === 'failed' ? 0 : deliveredCrates,
          emptyCratesCollected: deliveryStatus === 'failed' ? 0 : emptyCratesCollected,
          paymentMethod: deliveryStatus === 'failed' ? undefined : paymentMethod,
          amountCollected: deliveryStatus === 'failed' ? 0 : amountCollected,
          mobileMoneyTxRef: txRef.trim() ? txRef.trim() : undefined,
          failureReason: deliveryStatus === 'failed' ? failureReason : undefined,
          completedAt: new Date().toISOString(),
        };
      }
      return s;
    });

    driftStore.updateDocument('tours', activeTour.id, {
      stops: updatedStops,
    });

    setToastMessage(`Arrêt ${currentStop.stopOrder} (${currentStop.customerName}) enregistré en local (Drift).`);
    setTimeout(() => setToastMessage(null), 3000);

    // Auto-advance to next pending stop if available
    if (activeStopIndex < activeTour.stops.length - 1) {
      handleSelectStop(activeStopIndex + 1);
    }
  };

  // Reconcile and close tour
  const handleConfirmReconciliation = () => {
    if (!activeTour) return;

    let cash = 0;
    let momo = 0;
    let om = 0;
    let deliveredTotal = 0;
    let emptiesTotal = 0;

    for (const s of activeTour.stops) {
      deliveredTotal += s.deliveredCrates;
      emptiesTotal += s.emptyCratesCollected;
      if (s.paymentMethod === 'cash') cash += s.amountCollected;
      if (s.paymentMethod === 'mtnMomo') momo += s.amountCollected;
      if (s.paymentMethod === 'orangeMoney') om += s.amountCollected;
    }

    const unsoldFullCrates = activeTour.totalLoadedCrates - deliveredTotal;

    const recon: CashierReconciliation = {
      totalCashHandedOver: cash,
      totalMtnMomo: momo,
      totalOrangeMoney: om,
      emptyCratesReturnedToDepot: emptiesTotal,
      fullCratesReturnedUnsold: unsoldFullCrates,
      cashDiscrepancy: 0,
      cratesDiscrepancy: 0,
      cashierUserId: currentUser.userId,
      cashierName: currentUser.userName,
      reconciledAt: new Date().toISOString(),
    };

    driftStore.updateDocument('tours', activeTour.id, {
      status: 'reconciled',
      closedAt: new Date().toISOString(),
      reconciliation: recon,
    });

    setShowReconcileModal(false);
    setToastMessage('Tournée clôturée et réconciliée avec succès en caisse !');
    setTimeout(() => setToastMessage(null), 4000);
  };

  if (!activeTour) {
    return (
      <div className="p-6 text-center text-slate-400">
        <Truck className="w-12 h-12 mx-auto text-slate-500 mb-3" />
        <p className="font-semibold text-slate-200">Aucune tournée active assignée.</p>
        <button
          onClick={onOpenOrderModal}
          className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm"
        >
          Créer une commande
        </button>
      </div>
    );
  }

  const completedStops = activeTour.stops.filter((s) => s.status !== 'pending').length;

  return (
    <div className="flex flex-col h-full bg-slate-100 text-slate-900 overflow-y-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="sticky top-2 z-50 mx-4 p-3 bg-emerald-900 text-emerald-100 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Driver & Tour Header Bar */}
      <div className="bg-slate-900 text-white px-4 py-3 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-amber-600 flex items-center justify-center font-bold text-xs text-white">
              {currentUser.userName.charAt(0)}
            </div>
            <div>
              <div className="text-xs font-bold leading-tight">{currentUser.userName}</div>
              <div className="text-[10px] text-slate-400">
                {activeTour.vehicleName} · {activeTour.tourNumber}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                title="Paramètres & Sauvegarde"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              title="Changer d'utilisateur / Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center justify-between text-[11px] mb-1.5 text-slate-300">
          <span>
            Arrêts validés: <strong className="text-amber-400">{completedStops}</strong>/
            {activeTour.stops.length}
          </span>
          <span>
            Chargement:{' '}
            <strong className="text-white font-mono">{activeTour.totalLoadedCrates}</strong>{' '}
            casiers
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-amber-500 h-full transition-all duration-300"
            style={{ width: `${(completedStops / activeTour.stops.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Horizontal Stops Bar */}
      <div className="bg-white border-b border-slate-200 px-3 py-2 flex gap-2 overflow-x-auto shrink-0">
        {activeTour.stops.map((stop, index) => {
          const isSelected = index === activeStopIndex;
          const isDone = stop.status !== 'pending';
          const isFailed = stop.status === 'failed';

          return (
            <button
              key={stop.stopOrder}
              onClick={() => handleSelectStop(index)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition shrink-0 ${
                isSelected
                  ? 'bg-amber-600 text-white shadow-sm'
                  : isDone
                  ? isFailed
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>#{stop.stopOrder}</span>
              <span className="truncate max-w-[100px]">{stop.customerName.split(' ')[0]}</span>
              {isDone && (
                <span className="text-[10px]">
                  {isFailed ? '✕' : '✓'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Delivery Stop Content */}
      {currentStop && (
        <div className="p-4 space-y-3.5 flex-1">
          {/* Customer Card */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                  Arrêt n°{currentStop.stopOrder}
                </div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  {currentStop.customerName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{currentStop.quarter} (Eséka)</p>
              </div>
              <a
                href={`tel:${currentStop.customerPhone}`}
                className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 hover:bg-emerald-100 shrink-0"
                title="Appeler le client"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-600">Commande attendue:</span>
              <div className="text-right">
                <span className="font-bold text-amber-700 mr-2">
                  {currentStop.expectedCrates} casiers
                </span>
                <span className="font-semibold text-slate-900">
                  {formatFcfa(currentStop.expectedAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Result (100% Livré / Partiel / Échec) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Statut de Livraison
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryStatus('delivered100')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition text-center ${
                  deliveryStatus === 'delivered100'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                100% Livré
              </button>
              <button
                type="button"
                onClick={() => setDeliveryStatus('partial')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition text-center ${
                  deliveryStatus === 'partial'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Partiel
              </button>
              <button
                type="button"
                onClick={() => setDeliveryStatus('failed')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition text-center ${
                  deliveryStatus === 'failed'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Échec
              </button>
            </div>

            {deliveryStatus === 'failed' && (
              <div className="pt-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Motif de non-livraison:
                </label>
                <select
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">Sélectionner un motif...</option>
                  <option value="Client absent / Bar fermé">Client absent / Bar fermé</option>
                  <option value="Fonds insuffisants / Pas d'argent">
                    Fonds insuffisants / Pas d'argent
                  </option>
                  <option value="Commande refusée (litige prix/qualité)">
                    Commande refusée (litige prix)
                  </option>
                  <option value="Accès impossible (boue / route impraticable)">
                    Accès impossible (route impraticable)
                  </option>
                </select>
              </div>
            )}
          </div>

          {deliveryStatus !== 'failed' && (
            <>
              {/* Empties & Full Crates Stepper */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Casiers & Emballages Vides
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-medium block mb-1">
                      Casiers pleins remis
                    </span>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setDeliveredCrates(Math.max(0, deliveredCrates - 1))}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-base flex items-center justify-center active:bg-slate-100"
                      >
                        -
                      </button>
                      <span className="text-lg font-bold text-slate-900 font-mono">
                        {deliveredCrates}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDeliveredCrates(deliveredCrates + 1)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-300 font-bold text-base flex items-center justify-center active:bg-slate-100"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                    <span className="text-[11px] text-emerald-800 font-bold block mb-1">
                      Casiers vides récupérés
                    </span>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          setEmptyCratesCollected(Math.max(0, emptyCratesCollected - 1))
                        }
                        className="w-8 h-8 rounded-lg bg-white border border-emerald-300 font-bold text-base text-emerald-800 flex items-center justify-center active:bg-emerald-100"
                      >
                        -
                      </button>
                      <span className="text-lg font-bold text-emerald-900 font-mono">
                        {emptyCratesCollected}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEmptyCratesCollected(emptyCratesCollected + 1)}
                        className="w-8 h-8 rounded-lg bg-white border border-emerald-300 font-bold text-base text-emerald-800 flex items-center justify-center active:bg-emerald-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Collection */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  3. Encaissement du Client (FCFA)
                </label>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                      paymentMethod === 'cash'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Espèces</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mtnMomo')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                      paymentMethod === 'mtnMomo'
                        ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>MTN MoMo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('orangeMoney')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                      paymentMethod === 'orangeMoney'
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Orange M.</span>
                  </button>
                </div>

                {paymentMethod !== 'cash' && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Référence SMS / Transaction ID:
                    </label>
                    <input
                      type="text"
                      value={txRef}
                      onChange={(e) => setTxRef(e.target.value)}
                      placeholder="Ex: MP241102.1450.A1982"
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono bg-slate-50 uppercase"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600 font-medium">Montant perçu:</span>
                    <button
                      type="button"
                      onClick={() => setAmountCollected(currentStop.expectedAmount)}
                      className="text-[11px] text-amber-700 font-bold hover:underline"
                    >
                      Montant exact ({formatFcfa(currentStop.expectedAmount)})
                    </button>
                  </div>
                  <input
                    type="number"
                    step="500"
                    value={amountCollected}
                    onChange={(e) => setAmountCollected(Number(e.target.value) || 0)}
                    className="w-full text-base font-bold font-mono p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-900"
                  />
                </div>
              </div>
            </>
          )}

          {/* Action Button */}
          <button
            onClick={handleSaveStop}
            className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-500 active:scale-[0.99] text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Valider l'Arrêt n°{currentStop.stopOrder}</span>
          </button>
        </div>
      )}

      {/* Tour Closing / Reconciliation Bottom Bar */}
      <div className="p-4 bg-white border-t border-slate-200 shrink-0">
        <button
          onClick={() => setShowReconcileModal(true)}
          className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition"
        >
          <Receipt className="w-4 h-4" />
          <span>Clôturer la Tournée & Réconciliation de Caisse</span>
        </button>
      </div>

      {/* Cashier Reconciliation Modal */}
      {showReconcileModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl animate-in fade-in slide-in-from-bottom">
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3" />
            <div className="flex items-center gap-2 text-slate-900 mb-1">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold">Réconciliation de Caisse Dépôt</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Tournée {activeTour.tourNumber} · Chauffeur: {activeTour.driverName}
            </p>

            {/* Calculations preview */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-600">Espèces physiques à verser:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatFcfa(
                    activeTour.stops.reduce(
                      (acc, s) => (s.paymentMethod === 'cash' ? acc + s.amountCollected : acc),
                      0
                    )
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">MTN MoMo reçu (compte dépôt):</span>
                <span className="font-bold text-amber-700 font-mono">
                  {formatFcfa(
                    activeTour.stops.reduce(
                      (acc, s) => (s.paymentMethod === 'mtnMomo' ? acc + s.amountCollected : acc),
                      0
                    )
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Orange Money reçu (compte dépôt):</span>
                <span className="font-bold text-orange-700 font-mono">
                  {formatFcfa(
                    activeTour.stops.reduce(
                      (acc, s) =>
                        s.paymentMethod === 'orangeMoney' ? acc + s.amountCollected : acc,
                      0
                    )
                  )}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900">
                <span>Total Recouvrement Tournée:</span>
                <span className="text-emerald-700 font-mono">
                  {formatFcfa(
                    activeTour.stops.reduce((acc, s) => acc + s.amountCollected, 0)
                  )}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between">
                <span className="text-slate-600">Casiers pleins sortis:</span>
                <span className="font-mono font-semibold">{activeTour.totalLoadedCrates}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Casiers pleins livrés:</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {activeTour.stops.reduce((acc, s) => acc + s.deliveredCrates, 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Casiers vides récupérés rentrés:</span>
                <span className="font-mono font-semibold text-amber-700">
                  {activeTour.stops.reduce((acc, s) => acc + s.emptyCratesCollected, 0)}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-emerald-700 font-semibold pt-1">
                <span>Écart de caisse:</span>
                <span>0 FCFA (Conforme)</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowReconcileModal(false)}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmReconciliation}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm"
              >
                Valider Caisse & Clôturer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
