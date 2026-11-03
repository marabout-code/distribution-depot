import React, { useState, useEffect } from 'react';
import { Truck, Key, ShieldAlert, Delete } from 'lucide-react';
import { driftStore, LOCAL_CREDENTIALS } from '../services/driftStore';
import { AuthUser } from '../types';

interface PinLoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const PinLoginView: React.FC<PinLoginViewProps> = ({ onLoginSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lockoutSec, setLockoutSec] = useState<number | null>(null);

  useEffect(() => {
    // Check initial lockout
    const attempts = driftStore.getAttempts();
    if (attempts.lockoutUntil) {
      const remaining = Math.ceil(
        (new Date(attempts.lockoutUntil).getTime() - Date.now()) / 1000
      );
      if (remaining > 0) {
        setLockoutSec(remaining);
      }
    }
  }, []);

  useEffect(() => {
    if (lockoutSec === null || lockoutSec <= 0) return;
    const timer = setInterval(() => {
      setLockoutSec((prev) => {
        if (!prev || prev <= 1) {
          setError(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSec]);

  const handleDigit = (digit: string) => {
    if (lockoutSec) return;
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(null);
      if (newPin.length === 4) {
        submitPin(newPin);
      }
    }
  };

  const submitPin = (submittedPin: string) => {
    const result = driftStore.verifyPin(submittedPin);
    if (result.success && result.user) {
      onLoginSuccess(result.user);
    } else {
      setError(result.error || 'Code PIN incorrect');
      setPin('');
      if (result.lockoutSecondsRemaining) {
        setLockoutSec(result.lockoutSecondsRemaining);
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError(null);
    }
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none">
      {/* Top identity */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-slate-400 font-medium">Eséka Dépôt Central</span>
        </div>
        <span className="text-amber-400 font-mono font-semibold">FCFA / XAF</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Brand logo & title */}
        <div className="w-16 h-16 rounded-2xl bg-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/30 mb-3">
          <Truck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white mb-1">
          Eséka Distribution
        </h1>
        <p className="text-xs text-slate-400 text-center mb-6">
          Code PIN à 4 chiffres · Authentification 100% hors-ligne
        </p>

        {/* 4 PIN Dots */}
        <div className="flex items-center gap-4 mb-4">
          {[0, 1, 2, 3].map((index) => {
            const filled = index < pin.length;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  filled
                    ? 'bg-amber-500 scale-110 shadow-sm shadow-amber-500/50'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Status / Error feedback */}
        <div className="h-10 flex items-center justify-center text-center px-4">
          {lockoutSec ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 bg-rose-950/40 px-3 py-1 rounded-md border border-rose-800/50">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Verrouillé suite à 3 échecs ({lockoutSec}s)</span>
            </div>
          ) : error ? (
            <p className="text-xs text-rose-400 font-medium">{error}</p>
          ) : (
            <p className="text-xs text-slate-500">
              Vérifié localement contre Drift SQLite
            </p>
          )}
        </div>

        {/* 4-Digit Numpad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] my-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              disabled={!!lockoutSec}
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 transition text-xl font-semibold text-white border border-slate-800 disabled:opacity-30 disabled:pointer-events-none"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-14 rounded-2xl bg-slate-900/60 hover:bg-slate-800 text-sm font-semibold text-slate-400 border border-slate-800"
          >
            C
          </button>
          <button
            disabled={!!lockoutSec}
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 transition text-xl font-semibold text-white border border-slate-800 disabled:opacity-30 disabled:pointer-events-none"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-slate-900/60 hover:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-800"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Quick Demo Switcher */}
      <div className="p-3 mx-4 mb-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-2">
          <Key className="w-3.5 h-3.5" />
          <span>Comptes Démo (Connexion rapide 1-clic)</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {LOCAL_CREDENTIALS.map((c) => (
            <button
              key={c.userId}
              onClick={() => submitPin(c.pinHash)}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-left transition border border-slate-700/60"
            >
              <div className="font-semibold text-slate-200 truncate">
                {c.userName.split(' ')[0]} ({c.role})
              </div>
              <div className="text-[10px] text-amber-400/80 font-mono">
                PIN: {c.pinHash}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
