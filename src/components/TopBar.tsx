import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { NetworkStatus } from '../types';

interface TopBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  networkStatus: NetworkStatus;
  setNetworkStatus: (status: NetworkStatus) => void;
  isSyncing: boolean;
  onSync: () => void;
  dirtyCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  networkStatus,
  setNetworkStatus,
  isSyncing,
  onSync,
  dirtyCount,
}) => {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900 border-b border-slate-800 text-white">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center font-bold text-white text-base shadow-sm">
          ED
        </div>
        <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
          Eséka Distribution
        </span>
      </div>

      {/* Zone 2: 4-5 concise single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('mobile')}
          className={`transition-colors whitespace-nowrap py-1 ${
            activeTab === 'mobile'
              ? 'text-amber-400 font-semibold border-b-2 border-amber-400'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          App Smartphone
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`transition-colors whitespace-nowrap py-1 ${
            activeTab === 'dashboard'
              ? 'text-amber-400 font-semibold border-b-2 border-amber-400'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          Console Dépôt
        </button>
        <button
          onClick={() => setActiveTab('drift')}
          className={`transition-colors whitespace-nowrap py-1 flex items-center gap-2 ${
            activeTab === 'drift'
              ? 'text-amber-400 font-semibold border-b-2 border-amber-400'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <span>Base Drift SQLite</span>
          {dirtyCount > 0 && (
            <span className="text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-mono">
              {dirtyCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`transition-colors whitespace-nowrap py-1 ${
            activeTab === 'settings'
              ? 'text-amber-400 font-semibold border-b-2 border-amber-400'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          Paramètres & Sauvegarde
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`transition-colors whitespace-nowrap py-1 ${
            activeTab === 'code'
              ? 'text-amber-400 font-semibold border-b-2 border-amber-400'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          Code Flutter & SQL
        </button>
      </nav>

      {/* Zone 3: 1 primary action (Network toggle & Sync status) */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() =>
            setNetworkStatus(networkStatus === 'online' ? 'offline' : 'online')
          }
          className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            networkStatus === 'online'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
              : 'bg-amber-950 text-amber-300 border border-amber-800 hover:bg-amber-900'
          }`}
          title="Basculer le mode réseau (tester le comportement 100% offline)"
        >
          {networkStatus === 'online' ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span>En Ligne</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Hors-Ligne (Offline)</span>
            </>
          )}
        </button>

        <button
          onClick={onSync}
          disabled={isSyncing || networkStatus === 'offline'}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            networkStatus === 'offline'
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Synchro...' : 'Sync Supabase'}</span>
        </button>
      </div>
    </header>
  );
};
