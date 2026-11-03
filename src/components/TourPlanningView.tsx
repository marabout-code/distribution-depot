import React, { useState } from 'react';
import { Truck, ArrowUp, ArrowDown, MapPin, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { driftStore, INITIAL_VEHICLES } from '../services/driftStore';
import { DeliveryStop, Tour, Vehicle } from '../types';

interface TourPlanningViewProps {
  onTourCreated?: (tour: Tour) => void;
  onOpenOrderModal: () => void;
}

export const TourPlanningView: React.FC<TourPlanningViewProps> = ({
  onTourCreated,
  onOpenOrderModal,
}) => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle>(INITIAL_VEHICLES[1]); // Pickup 90 casiers
  const [selectedDriverId, setSelectedDriverId] = useState<string>('user_driver_paul');
  const [stops, setStops] = useState<DeliveryStop[]>([
    {
      stopOrder: 1,
      orderId: 'ord_demo_01',
      customerName: 'Bar Le Boukarou Eséka',
      customerPhone: '+237 677 12 34 56',
      quarter: 'Quartier Gare',
      expectedCrates: 25,
      expectedAmount: 200000,
      status: 'pending',
      deliveredCrates: 0,
      emptyCratesCollected: 0,
      amountCollected: 0,
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
  ]);

  const drivers = [
    { id: 'user_driver_paul', name: 'Paul Mvondo (Chauffeur Poids Lourd)' },
    { id: 'user_driver_alain', name: 'Alain Mbida (Chauffeur Pickup)' },
    { id: 'user_driver_jean', name: 'Jean Bikoi (Chauffeur Tricycle)' },
  ];

  const formatFcfa = (val: number) => {
    return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })
      .format(val)
      .replace('FCFA', 'FCFA');
  };

  const totalCrates = stops.reduce((sum, s) => sum + s.expectedCrates, 0);
  const totalAmount = stops.reduce((sum, s) => sum + s.expectedAmount, 0);
  const isOverloaded = totalCrates > selectedVehicle.maxCrates;

  const moveStop = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stops.length) return;

    const reordered = [...stops];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    // Update stopOrder 1, 2, 3...
    const updated = reordered.map((s, idx) => ({ ...s, stopOrder: idx + 1 }));
    setStops(updated);
  };

  const handleCreateTour = () => {
    if (isOverloaded) return;

    const tourId = `tour_${Date.now().toString(36)}`;
    const driverObj = drivers.find((d) => d.id === selectedDriverId);

    const newTour: Tour = {
      id: tourId,
      tourNumber: `TR-${new Date().getFullYear()}-ESK-0${stops.length}`,
      depositId: 'depot_eseka_centre',
      driverId: selectedDriverId,
      driverName: driverObj?.name.split(' ')[0] || 'Paul',
      vehicleId: selectedVehicle.id,
      vehicleName: `${selectedVehicle.name} (${selectedVehicle.plate})`,
      vehicleType: selectedVehicle.type,
      stops,
      status: 'inProgress',
      totalLoadedCrates: totalCrates,
      startedAt: new Date().toISOString(),
    };

    // Save into Drift generic documents table (marks dirty=true)
    driftStore.createDocument('tours', tourId, newTour, 'depot_eseka_centre');

    if (onTourCreated) {
      onTourCreated(newTour);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Fleet Vehicle Selection */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            1. Véhicule & Capacité Casiers
          </label>
          <span className="text-xs text-slate-500 font-medium">Flotte Dépôt Eséka</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {INITIAL_VEHICLES.map((v) => {
            const isSelected = selectedVehicle.id === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVehicle(v)}
                className={`p-3.5 rounded-xl border text-left transition ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 text-xs">{v.name}</span>
                  <Truck
                    className={`w-4 h-4 ${
                      isSelected ? 'text-amber-600' : 'text-slate-400'
                    }`}
                  />
                </div>
                <div className="text-[11px] text-slate-500 font-mono">{v.plate}</div>
                <div className="text-xs font-bold text-amber-700 mt-1">
                  Capacité: {v.maxCrates} casiers
                </div>
              </button>
            );
          })}
        </div>

        {/* Load Gauge */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <div className="flex justify-between items-center mb-1.5">
            <span className="font-medium text-slate-700">
              Chargement prévisionnel: <strong className="text-slate-900">{totalCrates}</strong> /{' '}
              {selectedVehicle.maxCrates} casiers
            </span>
            <span
              className={`font-bold font-mono ${
                isOverloaded ? 'text-rose-600' : 'text-emerald-700'
              }`}
            >
              {Math.round((totalCrates / selectedVehicle.maxCrates) * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isOverloaded ? 'bg-rose-500' : 'bg-emerald-600'
              }`}
              style={{
                width: `${Math.min(100, (totalCrates / selectedVehicle.maxCrates) * 100)}%`,
              }}
            />
          </div>
          {isOverloaded && (
            <div className="flex items-center gap-1.5 text-rose-700 font-semibold mt-2">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Surcharge ! Veuillez réduire les commandes ou choisir un plus grand camion.</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Driver Assignment */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          2. Affectation du Chauffeur / Livreur
        </label>
        <select
          value={selectedDriverId}
          onChange={(e) => setSelectedDriverId(e.target.value)}
          className="w-full text-sm font-semibold p-3 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-amber-500"
        >
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Ordered Route Map */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              3. Feuille de Route & Ordre des Arrêts
            </label>
            <span className="text-xs text-slate-500">
              Ordonnez les étapes (Stop 1, Stop 2...) pour optimiser le trajet à Eséka
            </span>
          </div>
          <button
            onClick={onOpenOrderModal}
            className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg flex items-center gap-1 border border-amber-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter Arrêt</span>
          </button>
        </div>

        <div className="space-y-2">
          {stops.map((stop, index) => (
            <div
              key={stop.orderId}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between gap-3 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {stop.stopOrder}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{stop.customerName}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {stop.quarter}
                    </span>
                    <span>·</span>
                    <span>{stop.customerPhone}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-bold text-amber-700 text-xs font-mono">
                    {stop.expectedCrates} casiers
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {formatFcfa(stop.expectedAmount)}
                  </div>
                </div>

                {/* Move buttons */}
                <div className="flex flex-col gap-1">
                  <button
                    disabled={index === 0}
                    onClick={() => moveStop(index, 'up')}
                    className="p-1 rounded bg-white hover:bg-slate-200 disabled:opacity-20 text-slate-600 border border-slate-200"
                    title="Monter l'arrêt"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    disabled={index === stops.length - 1}
                    onClick={() => moveStop(index, 'down')}
                    className="p-1 rounded bg-white hover:bg-slate-200 disabled:opacity-20 text-slate-600 border border-slate-200"
                    title="Descendre l'arrêt"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tour Total */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">
            Total Tournée: <strong className="text-slate-900">{stops.length} arrêts</strong> ·{' '}
            <strong className="text-amber-700">{totalCrates} casiers</strong>
          </span>
          <span className="font-bold text-slate-900 text-sm font-mono">
            {formatFcfa(totalAmount)}
          </span>
        </div>
      </div>

      {/* Launch Tour CTA */}
      <button
        onClick={handleCreateTour}
        disabled={isOverloaded || stops.length === 0}
        className="w-full py-4 px-6 bg-amber-600 hover:bg-amber-500 active:scale-[0.99] text-white rounded-2xl font-bold text-sm shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <CheckCircle className="w-4 h-4" />
        <span>Valider & Démarrer la Tournée ({totalCrates} casiers)</span>
      </button>
    </div>
  );
};
