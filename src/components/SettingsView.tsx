import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Timer,
  Key,
  FolderOpen,
  Download,
  Upload,
  Database,
  RefreshCw,
  Mail,
  MessageCircle,
  ExternalLink,
  Check,
  AlertCircle,
  HardDrive,
  Copy,
  Trash2,
  Laptop,
  Terminal,
  Smartphone,
} from 'lucide-react';
import {
  APP_ABOUT_INFO,
  driftStore,
  generateDeveloperUnlockCode,
} from '../services/driftStore';
import { BackupSettings, TrialLicenseInfo } from '../types';

interface SettingsViewProps {
  onBackToApp?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBackToApp }) => {
  const [license, setLicense] = useState<TrialLicenseInfo>(() =>
    driftStore.getTrialLicenseInfo()
  );
  const [backupSettings, setBackupSettings] = useState<BackupSettings>(() =>
    driftStore.getBackupSettings()
  );
  const [hasSeed, setHasSeed] = useState<boolean>(() => driftStore.hasSeedData());

  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [licenseMessage, setLicenseMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);

  // Developer Machine Generator Tool State
  const [devInputMachineId, setDevInputMachineId] = useState(license.machineId);
  const [generatedDevKey, setGeneratedDevKey] = useState<string>('');
  const [showDevConsole, setShowDevConsole] = useState(true);

  const [isEditingRepertory, setIsEditingRepertory] = useState(false);
  const [customRepertory, setCustomRepertory] = useState(
    backupSettings.storageRepertory
  );

  const [seedModalAction, setSeedModalAction] = useState<'load' | 'unload' | null>(
    null
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedContact, setCopiedContact] = useState<string | null>(null);

  const suggestedPaths = [
    '/storage/emulated/0/Documents/EsekaBackups/',
    '/storage/emulated/0/Download/EsekaDistribution/',
    '/storage/sdcard1/EsekaBackups/',
    '/data/user/0/com.eseka.distribution/databases/',
  ];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleActivateLicense = () => {
    const res = driftStore.activateLicenseKey(licenseKeyInput);
    if (res.success) {
      setLicense(driftStore.getTrialLicenseInfo());
      setLicenseMessage({ text: res.message, isError: false });
      setTimeout(() => {
        setShowKeyModal(false);
        setLicenseMessage(null);
      }, 1500);
      showToast('Licence commerciale activée avec succès !');
    } else {
      setLicenseMessage({ text: res.message, isError: true });
    }
  };

  const handleSaveRepertory = (newPath: string) => {
    driftStore.updateBackupSettings({ storageRepertory: newPath });
    setBackupSettings(driftStore.getBackupSettings());
    setIsEditingRepertory(false);
    showToast(`Répertoire de sauvegarde mis à jour : ${newPath}`);
  };

  const handleExportBackup = () => {
    const jsonStr = driftStore.exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `eseka_drift_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setBackupSettings(driftStore.getBackupSettings());
    showToast(
      `Fichier de sauvegarde exporté vers ${backupSettings.storageRepertory}`
    );
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const res = driftStore.importBackup(content);
      if (res.success) {
        showToast(
          `Restauration réussie ! ${res.count} enregistrements Drift restaurés.`
        );
        setHasSeed(driftStore.hasSeedData());
      } else {
        showToast(`Erreur de restauration : ${res.error}`);
      }
    };
    reader.readAsText(file);
    // Reset file input value
    event.target.value = '';
  };

  const handleConfirmSeedToggle = () => {
    if (seedModalAction === 'unload') {
      driftStore.unloadSeedData();
      setHasSeed(false);
      showToast('Jeu de données démo purgé. Base prête pour la production.');
    } else if (seedModalAction === 'load') {
      driftStore.loadSeedData();
      setHasSeed(true);
      showToast('Jeu de données démo d\'Eséka rechargé avec succès.');
    }
    setSeedModalAction(null);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedContact(label);
    setTimeout(() => setCopiedContact(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="sticky top-2 z-50 p-3 bg-emerald-900 text-emerald-100 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 tracking-wider uppercase mb-1">
            <Settings className="w-4 h-4" />
            <span>Configuration & Maintenance Dépôt</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
            Paramètres, Sauvegarde & Licence
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestion du répertoire de stockage Drift, licence 60 jours et assistance technique PondyCode
          </p>
        </div>

        {onBackToApp && (
          <button
            onClick={onBackToApp}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-700"
          >
            ← Revenir à l'application
          </button>
        )}
      </div>

      {/* 1. 60-Day Trial License Card */}
      <div
        className={`p-6 rounded-3xl border transition shadow-xs ${
          license.isActivated
            ? 'bg-emerald-50/60 border-emerald-200'
            : license.daysRemaining <= 10
            ? 'bg-rose-50/60 border-rose-200'
            : 'bg-amber-50/60 border-amber-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                license.isActivated
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-600 text-white'
              }`}
            >
              {license.isActivated ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <Timer className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {license.isActivated
                    ? 'Licence Commerciale Illimitée'
                    : 'Licence d\'Évaluation (Essai 60 Jours)'}
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    license.isActivated
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-amber-200 text-amber-900'
                  }`}
                >
                  {license.isActivated ? 'ACTIVÉE' : 'EN COURS'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {license.isActivated
                  ? `Attribuée à : ${license.activatedTo}`
                  : `Installation : ${new Date(license.installedAt).toLocaleDateString(
                      'fr-FR'
                    )} · Valable 60 jours`}
              </p>
            </div>
          </div>

          {!license.isActivated && (
            <button
              onClick={() => setShowKeyModal(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Activer Clé Commerciale</span>
            </button>
          )}
        </div>

        {/* Progress or Status */}
        {!license.isActivated ? (
          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Période restante :{' '}
                <strong className="text-amber-700 font-mono text-sm">
                  {license.daysRemaining} jours
                </strong>{' '}
                / 60 jours
              </span>
              <span className="text-slate-500 font-mono">
                {Math.round(((60 - license.daysRemaining) / 60) * 100)}% écoulés
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(
                    5,
                    ((60 - license.daysRemaining) / 60) * 100
                  )}%`,
                }}
              />
            </div>

            {/* Unique Machine Token Box */}
            <div className="p-3.5 bg-white/80 rounded-2xl border border-amber-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                  <span>Code Machine Unique de cet Appareil :</span>
                </span>
                <span className="font-mono font-bold text-slate-900 bg-amber-100/60 px-2.5 py-0.5 rounded-lg border border-amber-300 text-sm">
                  {license.machineId}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Pour obtenir votre clé officielle de déblocage, transmettez ce code machine à la machine du développeur :
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => copyToClipboard(license.machineId, 'machineId')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedContact === 'machineId' ? 'Code Machine Copié !' : 'Copier Code Machine'}</span>
                </button>
                <a
                  href={`https://wa.me/237674667234?text=${encodeURIComponent(
                    `Bonjour PondyCode, voici mon code machine Eséka Distribution pour obtenir ma clé de déblocage : ${license.machineId}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Envoyer à PondyCode via WhatsApp (+237674667234)</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-emerald-800 font-medium flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>
                Appareil lié : <code className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-300">{license.machineId}</code> · Clé validée : <code className="font-mono font-bold">{license.licenseKey}</code>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Developer Machine Console: Keygen Tool (PondyCode) */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center border border-indigo-500/40">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Machine Développeur PondyCode · Générateur de Clé</span>
                <span className="text-[10px] font-mono bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-700">
                  DEVELOPER ONLY
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Outil réservé au développeur pour calculer la clé de déblocage correspondant au Code Machine du client
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDevConsole(!showDevConsole)}
            className="text-xs font-semibold text-slate-400 hover:text-white"
          >
            {showDevConsole ? 'Masquer' : 'Afficher'}
          </button>
        </div>

        {showDevConsole && (
          <div className="space-y-3.5 pt-2 border-t border-slate-800 text-xs animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              <div className="sm:col-span-8">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Code Machine Client (reçu par WhatsApp ou SMS) :
                </label>
                <input
                  type="text"
                  value={devInputMachineId}
                  onChange={(e) => setDevInputMachineId(e.target.value)}
                  placeholder="Ex: ESK-4A9B-81F2"
                  className="w-full text-xs font-mono uppercase p-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white font-bold"
                />
              </div>
              <div className="sm:col-span-4">
                <button
                  type="button"
                  onClick={() => {
                    const key = generateDeveloperUnlockCode(devInputMachineId);
                    setGeneratedDevKey(key);
                  }}
                  className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Calculer Clé</span>
                </button>
              </div>
            </div>

            {generatedDevKey && (
              <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">Clé de Déblocage Générée pour {devInputMachineId} :</span>
                  <span className="font-mono font-bold text-amber-400 text-sm select-all">
                    {generatedDevKey}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1 border-t border-indigo-900/60">
                  <button
                    onClick={() => copyToClipboard(generatedDevKey, 'devKey')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedContact === 'devKey' ? 'Clé Copiée !' : 'Copier pour envoyer au client'}</span>
                  </button>
                  <button
                    onClick={() => {
                      const res = driftStore.activateLicenseKey(generatedDevKey);
                      if (res.success) {
                        setLicense(driftStore.getTrialLicenseInfo());
                        showToast('Appareil activé avec succès avec la clé développeur !');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Check className="w-3 h-3" />
                    <span>Appliquer & Débloquer cet Appareil Immédiatement</span>
                  </button>
                </div>
              </div>
            )}

            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>
                Commande terminal sur votre machine : <code className="text-indigo-300 font-mono">dart run scripts/developer_keygen.dart {devInputMachineId}</code>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Backup & Restore & Repertory Choice */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-slate-900">
              Sauvegarde & Restauration (Drift SQLite)
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {backupSettings.backupCount} sauvegardes effectuées
          </span>
        </div>

        {/* Chosen Storage Repertory */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>Répertoire de stockage des données :</span>
            </label>
            <button
              onClick={() => {
                setCustomRepertory(backupSettings.storageRepertory);
                setIsEditingRepertory(!isEditingRepertory);
              }}
              className="text-xs font-bold text-amber-700 hover:text-amber-800"
            >
              {isEditingRepertory ? 'Fermer' : 'Choisir un dossier'}
            </button>
          </div>

          <div className="font-mono text-xs p-3 bg-white rounded-xl border border-slate-200 text-slate-800 break-all select-all">
            {backupSettings.storageRepertory}
          </div>

          {isEditingRepertory && (
            <div className="space-y-3 pt-2 border-t border-slate-200 animate-in fade-in">
              <span className="text-[11px] text-slate-500 font-medium block">
                Dossiers recommandés sur smartphone Android / tablette :
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestedPaths.map((path) => (
                  <button
                    key={path}
                    onClick={() => handleSaveRepertory(path)}
                    className={`p-2.5 rounded-xl text-left text-xs font-mono border transition ${
                      backupSettings.storageRepertory === path
                        ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400 uppercase font-sans font-bold">
                      {path.includes('sdcard')
                        ? 'Carte SD Externe'
                        : path.includes('Download')
                        ? 'Dossier Téléchargements'
                        : path.includes('Documents')
                        ? 'Dossier Documents'
                        : 'Stockage Interne App'}
                    </div>
                    <div className="truncate">{path}</div>
                  </button>
                ))}
              </div>

              {/* Custom Path Input */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={customRepertory}
                  onChange={(e) => setCustomRepertory(e.target.value)}
                  placeholder="/storage/emulated/0/MonDossier/"
                  className="flex-1 text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-mono"
                />
                <button
                  onClick={() => handleSaveRepertory(customRepertory)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                >
                  Appliquer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons: Backup & Restore */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={handleExportBackup}
            className="p-4 rounded-2xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 flex items-center justify-between transition group text-left"
          >
            <div>
              <div className="font-bold text-xs uppercase tracking-wider text-teal-800">
                Exporter Sauvegarde
              </div>
              <div className="text-xs text-teal-700/80 mt-0.5">
                Générer un fichier JSON complet de la base Drift
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Download className="w-4 h-4" />
            </div>
          </button>

          <label className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-900 flex items-center justify-between transition group cursor-pointer text-left">
            <div>
              <div className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Restaurer Sauvegarde
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Importer un fichier de sauvegarde (.json)
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition">
              <Upload className="w-4 h-4" />
            </div>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 3. Toggle Button to Load / Unload Seed Data */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">
              Données de Démonstration (Seed Data)
            </h2>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              hasSeed
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {hasSeed ? 'Données Démo Chargées' : 'Base Vierge'}
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Permet de basculer facilement entre le jeu de test pour Eséka (catalogue Kadji, 33 Export, camions 5T, tournée démo) et une base de données de production vierge prête à accueillir vos vrais clients.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {hasSeed ? (
            <button
              onClick={() => setSeedModalAction('unload')}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Purger les Données Démo (Unload Seed Data)</span>
            </button>
          ) : (
            <button
              onClick={() => setSeedModalAction('load')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Charger les Données Démo (Load Seed Data)</span>
            </button>
          )}

          <span className="text-xs text-slate-400">
            {hasSeed
              ? 'Toutes les tables (produits, clients, tournées) sont peuplées.'
              : 'La base Drift est vide et prête pour l\'initialisation.'}
          </span>
        </div>
      </div>

      {/* 4. About Section */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-md space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-600 flex items-center justify-center font-bold text-white text-lg shadow-sm">
            ED
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{APP_ABOUT_INFO.appName}</h2>
            <p className="text-xs text-slate-400">
              Version {APP_ABOUT_INFO.version} · {APP_ABOUT_INFO.location}
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-slate-800">
          Application mobile 100% offline-first conçue pour les dépôts de boissons au Cameroun. Gestion intégrée des tournées de livraison, calcul automatique des casiers et consignes, encaissements multimodaux (Espèces, MTN MoMo, Orange Money) et réconciliation de caisse.
        </div>

        {/* Contact Info (Developer, Email, WhatsApp) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Email */}
          <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Support Email
                </span>
                <a
                  href={`mailto:${APP_ABOUT_INFO.email}`}
                  className="font-mono text-xs text-amber-400 hover:underline font-semibold"
                >
                  {APP_ABOUT_INFO.email}
                </a>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(APP_ABOUT_INFO.email, 'email')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
              title="Copier l'email"
            >
              {copiedContact === 'email' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* WhatsApp */}
          <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  WhatsApp Direct
                </span>
                <a
                  href={APP_ABOUT_INFO.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <span>{APP_ABOUT_INFO.whatsappFormatted}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(APP_ABOUT_INFO.whatsapp, 'whatsapp')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
              title="Copier le numéro WhatsApp"
            >
              {copiedContact === 'whatsapp' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="pt-2 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/60">
          <span>Développé par : <strong>{APP_ABOUT_INFO.developer}</strong></span>
          <span>{APP_ABOUT_INFO.stack}</span>
        </div>
      </div>

      {/* Modal: Activate License Key */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in fade-in space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Key className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold">Activer la Licence Commerciale</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Saisissez votre clé de licence pour débloquer l'utilisation sans limite de temps pour le dépôt d'Eséka :
            </p>

            <div>
              <input
                type="text"
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value)}
                placeholder="Ex: ESEKA-PRO-2024-XAF"
                className="w-full text-sm font-mono uppercase p-3 rounded-xl border border-slate-300 bg-slate-50 font-bold tracking-wider"
              />
              <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                <span>Clés de démonstration valides :</span>
                <button
                  type="button"
                  onClick={() => setLicenseKeyInput('ESEKA-PRO-2024-XAF')}
                  className="font-mono text-amber-700 underline font-semibold"
                >
                  ESEKA-PRO-2024-XAF
                </button>
              </div>
            </div>

            {licenseMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  licenseMessage.isError
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {licenseMessage.isError ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <Check className="w-4 h-4 shrink-0" />
                )}
                <span>{licenseMessage.text}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowKeyModal(false);
                  setLicenseMessage(null);
                }}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleActivateLicense}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition"
              >
                Valider & Débloquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Seed Data Load / Unload */}
      {seedModalAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in fade-in space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <AlertCircle
                className={`w-5 h-5 ${
                  seedModalAction === 'unload' ? 'text-rose-600' : 'text-emerald-600'
                }`}
              />
              <h3 className="text-base font-bold">
                {seedModalAction === 'unload'
                  ? 'Purger les Données Démo ?'
                  : 'Recharger les Données Démo ?'}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {seedModalAction === 'unload'
                ? 'Cette action va vider toutes les commandes, tournées, produits et clients de test pour vous laisser une base Drift SQLite complètement vierge.'
                : 'Cette action va réinsérer le catalogue complet des boissons d\'Eséka (Kadji, 33 Export, Guinness, Castel, Top), les 3 véhicules et les points de vente de test.'}
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSeedModalAction(null)}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmSeedToggle}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl text-white shadow-sm transition ${
                  seedModalAction === 'unload'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {seedModalAction === 'unload' ? 'Confirmer la Purge' : 'Confirmer le Chargement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
