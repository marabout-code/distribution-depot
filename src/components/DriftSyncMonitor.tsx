import React, { useState } from 'react';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Key,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { driftStore, LOCAL_CREDENTIALS } from '../services/driftStore';
import { DriftDocumentRow, NetworkStatus } from '../types';

interface DriftSyncMonitorProps {
  networkStatus: NetworkStatus;
  setNetworkStatus: (status: NetworkStatus) => void;
  isSyncing: boolean;
  onSync: () => void;
}

export const DriftSyncMonitor: React.FC<DriftSyncMonitorProps> = ({
  networkStatus,
  setNetworkStatus,
  isSyncing,
  onSync,
}) => {
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [expandedDocKey, setExpandedDocKey] = useState<string | null>(null);

  const rows = driftStore.getAllRows();
  const dirtyRows = driftStore.getDirtyRows();
  const attempts = driftStore.getAttempts();

  const collections = ['all', 'orders', 'tours', 'products', 'vehicles', 'customers'];

  const filteredRows = rows.filter((r) => {
    if (selectedCollection === 'all') return true;
    return r.collection === selectedCollection;
  });

  const handleSimulateMutation = () => {
    // Modify one product or tour to demonstrate offline dirty flag and monotonic version
    const tour = driftStore.getDocument<any>('tours', 'tour_esk_01');
    if (tour) {
      driftStore.updateDocument('tours', 'tour_esk_01', {
        notes: `Mise à jour locale effectuée hors-ligne à ${new Date().toLocaleTimeString()}`,
      });
    } else {
      driftStore.createDocument('orders', `ord_test_${Date.now()}`, {
        test: true,
        amount: 50000,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 tracking-wider uppercase mb-1">
            <Database className="w-4 h-4" />
            <span>Drift SQLite · Single Source of Truth</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            Moniteur de Base Locale & Synchro Supabase
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Table générique unique <code className="text-amber-300 font-mono">documents</code>,
            champs <code className="text-amber-300 font-mono">dirty</code>, versionnement LWW et
            tables auxiliaires
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSimulateMutation}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-700 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Simuler Écriture Locale</span>
          </button>
          <button
            onClick={onSync}
            disabled={isSyncing || networkStatus === 'offline'}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronisation...' : 'Pousser vers Supabase'}</span>
          </button>
        </div>
      </div>

      {/* Sync Status KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">
            Lignes Locales en Attente (dirty=true)
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                dirtyRows.length > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {dirtyRows.length}
            </span>
            <span className="text-xs text-slate-400">sur {rows.length} enregistrements</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {dirtyRows.length > 0
              ? 'Modifications locales prêtes pour le push Supabase'
              : 'Base locale 100% alignée avec le Cloud'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">
            Résolution des Conflits
          </span>
          <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Last-Write-Wins (LWW)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Incrémentation monotone de <code className="text-slate-800 font-mono">version</code>. La
            plus haute version gagne automatiquement.
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">
            Sécurité Code PIN (100% Offline)
          </span>
          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
            <Shield className="w-4 h-4 text-teal-600" />
            <span>3 Tentatives / Verrou 60s</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Table <code className="text-slate-800 font-mono">local_attempts</code> · Échecs actuels:{' '}
            <strong className="text-slate-900">{attempts.failedAttempts}/3</strong>
          </p>
        </div>
      </div>

      {/* Main Drift Table View */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Collection:
            </span>
            <div className="flex flex-wrap gap-1">
              {collections.map((col) => (
                <button
                  key={col}
                  onClick={() => setSelectedCollection(col)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                    selectedCollection === col
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {filteredRows.length} lignes affichées
          </span>
        </div>

        {/* Drift Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Collection / docId</th>
                <th className="py-3 px-3">Dépôt</th>
                <th className="py-3 px-3 text-center">Version</th>
                <th className="py-3 px-3 text-center">Dirty</th>
                <th className="py-3 px-3 text-center">Deleted</th>
                <th className="py-3 px-4">Dernière modif locale</th>
                <th className="py-3 px-4 text-right">Payload JSON</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredRows.map((row) => {
                const key = `${row.collection}::${row.docId}`;
                const isExpanded = expandedDocKey === key;

                return (
                  <React.Fragment key={key}>
                    <tr
                      className={`hover:bg-slate-50 transition ${
                        row.dirty ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <span className="text-slate-500 font-normal">{row.collection} / </span>
                        {row.docId}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {row.depositId || <span className="text-slate-400">null (partagé)</span>}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold">
                          v{row.version}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {row.dirty ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                            DIRTY (à envoyer)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                            CLEAN
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {row.deleted ? (
                          <span className="text-rose-600 font-bold">TOMBSTONE</span>
                        ) : (
                          <span className="text-slate-400">false</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(row.localUpdatedAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setExpandedDocKey(isExpanded ? null : key)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-sans font-medium"
                        >
                          {isExpanded ? 'Masquer' : 'Voir JSON'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-950 text-slate-200 font-mono text-[11px]">
                        <td colSpan={7} className="p-4">
                          <pre className="overflow-x-auto whitespace-pre-wrap max-h-60">
                            {JSON.stringify(row.payload, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auxiliary tables: local_credentials & local_attempts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Table local_credentials */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider mb-3">
            <Key className="w-4 h-4 text-amber-600" />
            <span>Table Auxiliaire: local_credentials</span>
          </div>
          <div className="space-y-2 text-xs">
            {LOCAL_CREDENTIALS.map((c) => (
              <div
                key={c.userId}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center"
              >
                <div>
                  <div className="font-bold text-slate-800">{c.userName}</div>
                  <div className="text-[11px] text-slate-500">
                    Rôle: <span className="font-semibold text-slate-700">{c.role}</span> · Dépôt:{' '}
                    {c.depositId || 'Tous'}
                  </div>
                </div>
                <span className="font-mono bg-white px-2 py-1 rounded border border-slate-300 font-semibold text-slate-900">
                  PIN: {c.pinHash}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Table local_attempts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider mb-3">
            <Shield className="w-4 h-4 text-teal-600" />
            <span>Table Auxiliaire: local_attempts</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Clé d'essai:</span>
              <span className="font-mono font-bold text-slate-900">{attempts.key}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Tentatives échouées:</span>
              <span className="font-mono font-bold text-rose-600">
                {attempts.failedAttempts} / 3
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Statut de verrouillage (60s):</span>
              <span
                className={`font-semibold ${
                  attempts.lockoutUntil ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {attempts.lockoutUntil
                  ? `Verrouillé jusqu'à ${new Date(attempts.lockoutUntil).toLocaleTimeString()}`
                  : 'Déverrouillé (Normal)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Dernière tentative:</span>
              <span className="font-mono text-slate-500 text-[11px]">
                {new Date(attempts.lastAttemptAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
