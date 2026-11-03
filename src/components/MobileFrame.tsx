import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Battery, Maximize2, Minimize2 } from 'lucide-react';
import { NetworkStatus } from '../types';

interface MobileFrameProps {
  children: React.ReactNode;
  networkStatus: NetworkStatus;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  children,
  networkStatus,
  isExpanded,
  onToggleExpand,
}) => {
  const [currentTime, setCurrentTime] = useState('10:42');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isExpanded) {
    return (
      <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[720px]">
        {/* Expanded Top Bar */}
        <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between text-xs border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-400">Eséka Distribution Mobile</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-300">Mode Plein Écran Développeur</span>
          </div>
          <button
            onClick={onToggleExpand}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition text-[11px]"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Mode Smartphone (390px)</span>
          </button>
        </div>
        <div className="flex-1 flex flex-col">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-4">
      {/* Device Viewport Toggle */}
      <div className="mb-3 flex items-center justify-between w-full max-w-[400px] px-2 text-xs text-slate-500">
        <span className="font-medium text-slate-600">Simulateur Mobile Flutter</span>
        <button
          onClick={onToggleExpand}
          className="text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1 transition"
        >
          <Maximize2 className="w-3 h-3" />
          <span>Agrandir</span>
        </button>
      </div>

      {/* Realistic Smartphone Frame */}
      <div className="w-[390px] h-[780px] bg-slate-950 rounded-[48px] p-3 shadow-2xl ring-1 ring-slate-800/80 ring-offset-2 flex flex-col relative select-none">
        {/* Outer Phone Bezel Details */}
        <div className="w-full h-full bg-white rounded-[38px] overflow-hidden flex flex-col relative">
          {/* iOS / Flutter Status Bar */}
          <div className="h-11 bg-slate-950 text-white px-7 flex items-center justify-between text-[11px] font-semibold shrink-0 z-40">
            <span>{currentTime}</span>

            {/* Dynamic Island / Notch */}
            <div className="w-24 h-4 bg-black rounded-full mx-auto" />

            <div className="flex items-center gap-1.5">
              {networkStatus === 'online' ? (
                <Wifi className="w-3.5 h-3.5 text-white" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              )}
              <Battery className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          {/* Screen Content */}
          <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-100">
            {children}
          </div>

          {/* Home Indicator Bar */}
          <div className="h-4 bg-white flex items-center justify-center shrink-0">
            <div className="w-32 h-1 bg-slate-300 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
