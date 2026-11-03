import React, { useState } from 'react';
import { X, Plus, Minus, ShoppingBag, Check } from 'lucide-react';
import { driftStore, INITIAL_CUSTOMERS, INITIAL_PRODUCTS } from '../services/driftStore';
import { Customer, Order, OrderItem } from '../types';

interface OrderCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated?: (order: Order) => void;
}

export const OrderCreationModal: React.FC<OrderCreationModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
}) => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(INITIAL_CUSTOMERS[0]);
  const [quantities, setQuantities] = useState<Record<string, number>>({
    prod_33_export: 10,
    prod_kadji: 5,
    prod_guinness: 4,
  });
  const [chargeDeposit, setChargeDeposit] = useState<Record<string, boolean>>({
    prod_33_export: false,
    prod_kadji: false,
    prod_guinness: true, // Example where customer doesn't have enough empties
  });

  if (!isOpen) return null;

  const formatFcfa = (val: number) => {
    return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 })
      .format(val)
      .replace('FCFA', 'FCFA');
  };

  const handleQtyChange = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  const totalCrates = Object.values(quantities).reduce((a, b) => a + b, 0);

  const totalLiquid = INITIAL_PRODUCTS.reduce((acc, p) => {
    const qty = quantities[p.id] || 0;
    return acc + qty * p.liquidPrice;
  }, 0);

  const totalDeposit = INITIAL_PRODUCTS.reduce((acc, p) => {
    const qty = quantities[p.id] || 0;
    const isCharged = chargeDeposit[p.id] || false;
    return acc + (isCharged ? qty * p.crateDepositPrice : 0);
  }, 0);

  const totalAmount = totalLiquid + totalDeposit;

  const handleSave = () => {
    if (totalCrates === 0) return;

    const orderId = `ord_${Date.now().toString(36)}`;
    const items: OrderItem[] = [];

    for (const p of INITIAL_PRODUCTS) {
      const qty = quantities[p.id] || 0;
      if (qty > 0) {
        items.push({
          productId: p.id,
          productName: p.name,
          quantityCrates: qty,
          unitLiquidPrice: p.liquidPrice,
          unitDepositPrice: p.crateDepositPrice,
          chargeDeposit: chargeDeposit[p.id] || false,
        });
      }
    }

    const newOrder: Order = {
      id: orderId,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      quarter: selectedCustomer.quarter,
      depositId: 'depot_eseka_centre',
      items,
      totalLiquidAmount: totalLiquid,
      totalDepositAmount: totalDeposit,
      totalAmount,
      totalCrates,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Save into Drift SQLite generic store (marks dirty=true)
    driftStore.createDocument('orders', orderId, newOrder, 'depot_eseka_centre');

    if (onOrderCreated) {
      onOrderCreated(newOrder);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold">Nouvelle Commande Client (Eséka)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Client & Emplacement
            </label>
            <select
              value={selectedCustomer.id}
              onChange={(e) => {
                const found = INITIAL_CUSTOMERS.find((c) => c.id === e.target.value);
                if (found) setSelectedCustomer(found);
              }}
              className="w-full text-sm font-semibold p-3 rounded-xl border border-slate-300 bg-slate-50 focus:ring-2 focus:ring-amber-500"
            >
              {INITIAL_CUSTOMERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type}) — {c.quarter}
                </option>
              ))}
            </select>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5 px-1">
              <span>Gérant: {selectedCustomer.ownerName} · {selectedCustomer.phone}</span>
              <span
                className={`font-semibold ${
                  selectedCustomer.emptyCratesBalance < 0
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}
              >
                Solde casiers vides: {selectedCustomer.emptyCratesBalance} casiers
              </span>
            </div>
          </div>

          {/* Beverage items catalog */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Calcul des Casiers & Consignes
            </label>

            <div className="space-y-2.5">
              {INITIAL_PRODUCTS.map((product) => {
                const qty = quantities[product.id] || 0;
                const isCharged = chargeDeposit[product.id] || false;
                const lineLiquid = qty * product.liquidPrice;
                const lineDeposit = isCharged ? qty * product.crateDepositPrice : 0;

                return (
                  <div
                    key={product.id}
                    className={`p-3.5 rounded-2xl border transition ${
                      qty > 0
                        ? 'border-amber-300 bg-amber-50/40'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{product.name}</div>
                        <div className="text-xs text-slate-500">
                          {product.category} · {product.crateCapacity} btls · {formatFcfa(product.liquidPrice)}/casier
                        </div>
                      </div>

                      {/* Stepper */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(product.id, -1)}
                          disabled={qty === 0}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center font-bold text-slate-700"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center font-mono font-bold text-slate-900 text-base">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(product.id, 1)}
                          className="w-8 h-8 rounded-lg bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center font-bold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {qty > 0 && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                          <input
                            type="checkbox"
                            checked={isCharged}
                            onChange={(e) =>
                              setChargeDeposit((prev) => ({
                                ...prev,
                                [product.id]: e.target.checked,
                              }))
                            }
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          <span>
                            Facturer consigne casier (+{formatFcfa(product.crateDepositPrice)}/casier)
                          </span>
                        </label>
                        <span className="font-bold text-slate-900 font-mono">
                          {formatFcfa(lineLiquid + lineDeposit)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals Summary */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Total casiers commandés:</span>
              <span className="font-bold text-white font-mono">{totalCrates} casiers</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Liquide boissons:</span>
              <span className="font-mono">{formatFcfa(totalLiquid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Consignes emballages facturées:</span>
              <span className="font-mono">{formatFcfa(totalDeposit)}</span>
            </div>
            <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm text-amber-400">
              <span>TOTAL COMMANDE (FCFA):</span>
              <span className="font-mono text-base">{formatFcfa(totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={totalCrates === 0}
            className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-40 shadow-sm transition flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Enregistrer dans Drift SQLite ({totalCrates} casiers)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
