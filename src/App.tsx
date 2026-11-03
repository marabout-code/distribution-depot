import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { MobileFrame } from './components/MobileFrame';
import { PinLoginView } from './components/PinLoginView';
import { DriverTourView } from './components/DriverTourView';
import { DepotDashboardView } from './components/DepotDashboardView';
import { TourPlanningView } from './components/TourPlanningView';
import { DriftSyncMonitor } from './components/DriftSyncMonitor';
import { CodeExplorerView } from './components/CodeExplorerView';
import { OrderCreationModal } from './components/OrderCreationModal';
import { SettingsView } from './components/SettingsView';
import { PermissionGuard } from './components/PermissionGuard';
import { driftStore } from './services/driftStore';
import { AuthUser, NetworkStatus, Tour } from './types';
import { Plus, Route, ShieldAlert, Sparkles, UserCheck, Settings } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('mobile');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => driftStore.getCurrentUser());
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(driftStore.networkStatus);
  const [isSyncing, setIsSyncing] = useState<boolean>(driftStore.isSyncing);
  const [dirtyCount, setDirtyCount] = useState<number>(driftStore.getDirtyRows().length);
  const [isMobileExpanded, setIsMobileExpanded] = useState<boolean>(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [isTourPlanningView, setIsTourPlanningView] = useState<boolean>(false);
  const [, setRerenderTrigger] = useState(0);

  // Subscribe to Drift SQLite store changes
  useEffect(() => {
    const unsubscribe = driftStore.subscribe(() => {
      setDirtyCount(driftStore.getDirtyRows().length);
      setIsSyncing(driftStore.isSyncing);
      setNetworkStatus(driftStore.networkStatus);
      setRerenderTrigger((n) => n + 1);
    });
    return unsubscribe;
  }, []);

  const handleNetworkChange = (status: NetworkStatus) => {
    driftStore.setNetworkStatus(status);
    setNetworkStatus(status);
  };

  const handleSync = async () => {
    await driftStore.syncNow();
  };

  const handleLoginSuccess = (user: AuthUser) => {
    driftStore.setCurrentUser(user);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    driftStore.setCurrentUser(null);
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Top Bar Navigation (Zone 1: Wordmark, Zone 2: Links, Zone 3: Actions) */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsTourPlanningView(false);
        }}
        networkStatus={networkStatus}
        setNetworkStatus={handleNetworkChange}
        isSyncing={isSyncing}
        onSync={handleSync}
        dirtyCount={dirtyCount}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'mobile' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Interactive Flutter Smartphone */}
            <div className={`mx-auto ${isMobileExpanded ? 'lg:col-span-12' : 'lg:col-span-7'}`}>
              <MobileFrame
                networkStatus={networkStatus}
                isExpanded={isMobileExpanded}
                onToggleExpand={() => setIsMobileExpanded(!isMobileExpanded)}
              >
                {currentUser == null ? (
                  <PinLoginView onLoginSuccess={handleLoginSuccess} />
                ) : (
                  <DriverTourView
                    currentUser={currentUser}
                    onLogout={handleLogout}
                    onOpenOrderModal={() => setIsOrderModalOpen(true)}
                    onOpenSettings={() => setActiveTab('settings')}
                  />
                )}
              </MobileFrame>
            </div>

            {/* Right: Quick Depot Companion & Context (shown when not expanded) */}
            {!isMobileExpanded && (
              <div className="lg:col-span-5 space-y-4">
                {/* Active User Card & PIN Switcher */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Session Active
                    </span>
                    {currentUser ? (
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {currentUser.role.toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-xs text-rose-600 font-semibold">
                        Déconnecté
                      </span>
                    )}
                  </div>

                  {currentUser ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          {currentUser.userName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {currentUser.depositId ? 'Dépôt Eséka Centre' : 'Accès Multi-dépôts (Superadmin)'}
                        </div>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
                      >
                        Tester PIN Lock
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">
                      Entrez le code PIN sur l'écran du smartphone pour déverrouiller la session.
                    </div>
                  )}
                </div>

                {/* Depot Quick Actions */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Actions Administrateur
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setIsOrderModalOpen(true)}
                      className="p-3 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-2xl border border-amber-200 text-left transition"
                    >
                      <Plus className="w-4 h-4 text-amber-600 mb-1" />
                      <div className="font-bold text-xs">Créer Commande</div>
                      <div className="text-[11px] text-amber-700/80">Casiers & consignes</div>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('dashboard');
                        setIsTourPlanningView(true);
                      }}
                      className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-2xl border border-slate-200 text-left transition"
                    >
                      <Route className="w-4 h-4 text-teal-600 mb-1" />
                      <div className="font-bold text-xs">Planifier Tournée</div>
                      <div className="text-[11px] text-slate-500">Camion 5T / Tricycle</div>
                    </button>
                  </div>

                  <button
                    onClick={() => setActiveTab('settings')}
                    className="w-full p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Paramètres, Sauvegarde & Licence 60 Jours</span>
                  </button>
                </div>

                {/* Offline-First & Drift Architecture Quick Card */}
                <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-sm space-y-2.5 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Garantie 100% Offline-First</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Toutes les écritures (validations de livraison, encaissements MoMo/OM/Espèces,
                    casiers retournés) sont enregistrées immédiatement dans la table{' '}
                    <code className="text-amber-300 font-mono">documents</code> de Drift SQLite.
                  </p>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-400">
                    <span>Modifications en attente:</span>
                    <span className="font-mono font-bold text-amber-400">{dirtyCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Moteur Cloud:</span>
                    <span className="text-emerald-400 font-semibold">Supabase PostgreSQL</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <PermissionGuard
            currentUser={currentUser}
            requiredPermission="view_depot_analytics"
            onSwitchUser={handleLoginSuccess}
          >
            {isTourPlanningView ? (
              <div className="space-y-4">
                <button
                  onClick={() => setIsTourPlanningView(false)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 mb-2"
                >
                  ← Revenir au Tableau de Bord
                </button>
                <TourPlanningView
                  onTourCreated={() => {
                    setIsTourPlanningView(false);
                    setActiveTab('mobile');
                  }}
                  onOpenOrderModal={() => setIsOrderModalOpen(true)}
                />
              </div>
            ) : (
              <DepotDashboardView
                onOpenOrderModal={() => setIsOrderModalOpen(true)}
                onOpenTourPlanning={() => setIsTourPlanningView(true)}
                onSwitchToMobile={() => setActiveTab('mobile')}
                onOpenSettings={() => setActiveTab('settings')}
              />
            )}
          </PermissionGuard>
        )}

        {activeTab === 'drift' && (
          <DriftSyncMonitor
            networkStatus={networkStatus}
            setNetworkStatus={handleNetworkChange}
            isSyncing={isSyncing}
            onSync={handleSync}
          />
        )}

        {activeTab === 'settings' && (
          <PermissionGuard
            currentUser={currentUser}
            requiredPermission="manage_backups"
            onSwitchUser={handleLoginSuccess}
          >
            <SettingsView onBackToApp={() => setActiveTab('mobile')} />
          </PermissionGuard>
        )}

        {activeTab === 'code' && <CodeExplorerView />}
      </main>

      {/* Order Creation Modal */}
      <OrderCreationModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onOrderCreated={() => {
          setActiveTab('dashboard');
        }}
      />
    </div>
  );
}
