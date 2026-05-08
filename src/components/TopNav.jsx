import React from 'react';
import { useAuth } from '../context/AuthContext';

const TopNav = ({ title }) => {
  const { extensionConnected } = useAuth();

  return (
    <header className="flex justify-between items-center w-full px-6 h-16 bg-slate-900/40 backdrop-blur-md border-b border-white/10 shadow-[0_0_15px_rgba(255,193,7,0.1)] z-10">
      <div className="flex items-center gap-4 md:hidden">
        <span className="material-symbols-outlined text-amber-400 cursor-pointer">menu</span>
        <span className="font-h2 font-bold text-xl text-amber-400 tracking-tight">PhishNinja</span>
      </div>
      <div className="hidden md:flex items-center gap-4">
        <span className="text-xl font-bold text-amber-400 tracking-tight font-h2">{title || 'Dashboard'}</span>
        <div className="h-4 w-[1px] bg-white/10 mx-2"></div>
        <span className="text-slate-400 font-mono-data text-xs uppercase tracking-widest opacity-50">System Status:</span>
        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${extensionConnected ? 'bg-emerald-400' : 'bg-rose-400'} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${extensionConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
          </span>
          <span className={`text-[10px] font-bold ${extensionConnected ? 'text-emerald-400' : 'text-rose-400'} uppercase tracking-tighter`}>
            {extensionConnected ? 'Extension Connected' : 'Extension Disconnected'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <span className="material-symbols-outlined text-slate-400 hover:bg-white/5 transition-colors p-2 rounded-full cursor-pointer">settings_input_antenna</span>
      </div>
    </header>
  );
};

export default TopNav;
