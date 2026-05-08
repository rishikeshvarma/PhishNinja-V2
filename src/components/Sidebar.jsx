import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
    { name: 'Logs', icon: 'security', path: '/logs' },
    { name: 'Settings', icon: 'settings', path: '/settings' },
  ];

  return (
    <aside className="hidden md:flex flex-col h-full py-6 px-4 bg-slate-900/60 backdrop-blur-lg w-64 border-r border-white/10 font-h2">
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-on-primary overflow-hidden">
          <img 
            alt="PhishNinja Logo" 
            className="w-full h-full object-contain scale-125" 
            src="/icon.png" 
          />
        </div>
        <div>
          <h1 className="text-lg font-black text-amber-400 leading-none">PhishNinja</h1>
          <p className="text-[10px] text-slate-400 tracking-widest uppercase">V2.1 Agentic AI</p>
        </div>
      </div>
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 py-3 px-4 rounded-lg transition-all duration-300 ${
                isActive
                  ? 'bg-white/10 text-amber-400 border-l-4 border-amber-400 shadow-[0_0_15px_rgba(255,193,7,0.1)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
        {user && (
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-amber-400/30 bg-slate-800">
              {user.picture ? (
                <img 
                  src={user.picture} 
                  alt={user.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-amber-400/10 text-amber-400">
                  <span className="material-symbols-outlined text-xl">person</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-slate-200 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 py-3 px-4 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-white/5 transition-all duration-300 group"
        >
          <span className="material-symbols-outlined group-hover:rotate-180 transition-transform duration-500">logout</span>
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
