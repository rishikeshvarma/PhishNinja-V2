import React from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { NavLink } from 'react-router-dom';

const Layout = ({ children, title }) => {
  return (
    <div className="bg-background text-on-surface font-body-md flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-amber-400/5 rounded-full blur-[100px] -z-10"></div>
        <TopNav title={title} />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-8 w-full">
            {children}
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-lg flex justify-around items-center border-t border-white/10 z-50">
          <NavLink to="/dashboard" className={({ isActive }) => `flex flex-col items-center ${isActive ? 'text-amber-400' : 'text-slate-400'}`}>
            <span className="material-symbols-outlined">dashboard</span>
            <span className="text-[10px] font-bold">Dashboard</span>
          </NavLink>
          <NavLink to="/logs" className={({ isActive }) => `flex flex-col items-center ${isActive ? 'text-amber-400' : 'text-slate-400'}`}>
            <span className="material-symbols-outlined">security</span>
            <span className="text-[10px] font-bold">Logs</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `flex flex-col items-center ${isActive ? 'text-amber-400' : 'text-slate-400'}`}>
            <span className="material-symbols-outlined">settings</span>
            <span className="text-[10px] font-bold">Settings</span>
          </NavLink>
        </nav>

        <footer className="bg-slate-950 border-t border-white/5 py-8 mt-auto hidden md:block">
          <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold font-h2">PhishNinja AI</span>
              <span className="text-slate-500 text-sm font-h2">© 2024. All rights reserved.</span>
            </div>
            <div className="flex gap-6">
              <a className="text-slate-500 text-sm font-h2 hover:text-amber-300 transition-colors" href="#">Privacy Policy</a>
              <a className="text-slate-500 text-sm font-h2 hover:text-amber-300 transition-colors" href="#">Terms of Service</a>
              <a className="text-slate-500 text-sm font-h2 hover:text-amber-300 transition-colors" href="#">Security Documentation</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Layout;
