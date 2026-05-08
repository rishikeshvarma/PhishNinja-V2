import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Layout from '../components/Layout';
import GlassCard from '../components/GlassCard';
import { useAuth } from '../context/AuthContext';
import { syncSettingsWithExtension } from '../utils/extensionSync';

const Settings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    aggressiveness_level: 'High Alert (Vigilant)',
    auto_sandbox: true,
    threat_intel_feed: true,
    daily_api_quota: 2000
  });
  const [allowlist, setAllowlist] = useState([]);
  const [bin, setBin] = useState([]);
  const [profilePic, setProfilePic] = useState(null);
  const [stats, setStats] = useState({ totalScanned: 0, threatsBlocked: 0 });
  const [usage, setUsage] = useState({ used: 0, limit: 14400 });
  const [loading, setLoading] = useState(true);
  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const headers = { 'Authorization': `Bearer ${user.token}` };
        const [settingsRes, statsRes, usageRes] = await Promise.all([
          fetch(`/api/user/settings`, { headers }),
          fetch(`/api/user/stats`, { headers }),
          fetch(`/api/usage`)
        ]);

        const settingsData = await settingsRes.json();
        const statsData = await statsRes.json();

        if (settingsData && !settingsData.error) {
          setSettings(settingsData.settings || settings);
          setAllowlist(settingsData.allowlist || []);
          setBin(settingsData.bin || []);
          setProfilePic(settingsData.profile_pic);
        }

        if (statsData && !statsData.error) {
          setStats(statsData);
        }

        try {
          const usageData = await usageRes.json();
          if (usageData && !usageData.error) {
            setUsage(usageData);
          }
        } catch (e) {
          console.warn('Usage fetch error:', e);
        }
      } catch (err) {
        console.error('Settings fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);
  
  useEffect(() => {
    if (allowlist.length > 0 || bin.length > 0) {
      syncSettingsWithExtension(allowlist, bin);
    }
  }, [allowlist, bin]);



  const updateSettings = async (newSettings) => {
    setSettings(newSettings);
    try {
      await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ settings: newSettings })
      });
    } catch (err) {
      console.error('Update settings error:', err);
    }
  };

  const handleToggle = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    updateSettings(newSettings);
  };

  const handleSelect = (e) => {
    const newSettings = { ...settings, aggressiveness_level: e.target.value };
    updateSettings(newSettings);
  };

  const removeFromList = async (listName, itemToRemove) => {
    const list = listName === 'allowlist' ? allowlist : bin;
    const newList = list.filter(item => item !== itemToRemove);
    if (listName === 'allowlist') setAllowlist(newList);
    else setBin(newList);

    try {
      await fetch('/api/user/settings/remove_list', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ listType: listName, url: itemToRemove })
      });
    } catch (err) {
      console.error(`Remove from ${listName} error:`, err);
    }
  };



  return (
    <Layout title="Account Settings">
      {/* Coming Soon Modal — portaled to body with pure inline styles */}
      {showComingSoon && ReactDOM.createPortal(
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' }}
          onClick={() => setShowComingSoon(false)}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5, 5, 10, 0.7)', backdropFilter: 'blur(12px)' }}></div>
          <div
            style={{
              position: 'relative',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
              backdropFilter: 'blur(20px)',
              borderRadius: '1.5rem',
              padding: '3rem',
              maxWidth: '30rem',
              width: '90%',
              textAlign: 'center',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(251, 191, 36, 0.1)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Watermark Logo */}
            <img
              src="/icon.png"
              alt=""
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80%',
                height: 'auto',
                opacity: 0.06,
                pointerEvents: 'none',
                userSelect: 'none',
                filter: 'grayscale(30%)'
              }}
            />
            <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'rgba(251,191,36,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(251,191,36,0.2)', position: 'relative', zIndex: 1 }}>
              <span className="material-symbols-outlined" style={{ color: '#fbbf24', fontSize: '1.875rem', fontVariationSettings: '"FILL" 1' }}>rocket_launch</span>
            </div>
            <h3 style={{ fontSize: '1.5rem', color: '#fbbf24', marginBottom: '0.75rem', fontWeight: 'bold', fontFamily: 'Space Grotesk, sans-serif', position: 'relative', zIndex: 1 }}>Coming Soon</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.6', fontFamily: 'Manrope, sans-serif', position: 'relative', zIndex: 1 }}>Subscription management is under development. Stay tuned for premium tiers, team plans, and advanced threat intelligence feeds.</p>
            <button
              onClick={() => setShowComingSoon(false)}
              style={{ padding: '0.75rem 2rem', background: '#fbbf24', color: '#1a1a2e', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 'bold', textTransform: 'uppercase', border: 'none', cursor: 'pointer', letterSpacing: '0.05em', fontFamily: 'Space Grotesk, sans-serif', transition: 'transform 0.2s', position: 'relative', zIndex: 1 }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              Got it
            </button>
          </div>
        </div>,
        document.body
      )}

      <div className="space-y-gutter">
        {/* Top Row: User Profile */}
        <section className="w-full text-left">
          <GlassCard glow className="p-md flex flex-col md:flex-row items-center gap-6">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full border-2 border-primary-container p-1 bg-surface-container-low overflow-hidden">
                <img
                  alt="User profile"
                  className="w-full h-full rounded-full object-cover"
                  src={profilePic || user?.picture || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"}
                />
              </div>
            </div>
            <div className="text-center md:text-left flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-1">
                <h2 className="font-h2 text-2xl text-primary font-bold">{user?.name || 'PhishNinja User'}</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 self-start md:self-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5 animate-pulse"></span>
                  Active Shield
                </span>
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant font-body-md">
                <span>{user?.email || 'user@phishninja.io'}</span>
                <span className="text-xs text-on-surface-variant/40">•</span>
                <span className="text-xs font-mono-data bg-surface-container-highest px-2 py-0.5 rounded border border-white/5 uppercase tracking-tighter">Free Tier</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowComingSoon(true)}
                className="px-6 py-2 bg-primary-container text-on-primary-container rounded-lg text-sm font-label-caps hover:scale-105 transition-transform uppercase"
              >
                Manage Subscription
              </button>
            </div>
          </GlassCard>
        </section>

        {/* Middle Row: Model Settings & Daily Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter text-left">
          {/* Card 1: Model Settings */}
          <GlassCard className="p-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-h3 text-xl text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container">smart_toy</span>
                AI Model Tuning
              </h3>
              <span className="px-3 py-1 bg-on-tertiary-fixed-variant/20 text-tertiary rounded-full text-[10px] font-label-caps uppercase tracking-wider">Active Agent</span>
            </div>
            <div className="space-y-6">
              <div className="group">
                <label className="block font-label-caps text-[10px] text-on-surface-variant mb-2 uppercase">Aggressiveness Level</label>
                <select
                  value={settings.aggressiveness_level}
                  onChange={handleSelect}
                  className="w-full bg-slate-900/50 border-b border-white/10 focus:border-primary-container text-on-surface p-3 outline-none appearance-none transition-all cursor-pointer font-body-md rounded-t-lg"
                >
                  <option value="Standard Detection (Balanced)">Standard Detection (Balanced)</option>
                  <option value="High Alert (Vigilant)">High Alert (Vigilant)</option>
                  <option value="Zero Trust (Maximum Security)">Zero Trust (Maximum Security)</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-3 border border-white/5 rounded-lg bg-white/5">
                <div>
                  <h4 className="font-mono-data text-sm text-on-surface">Auto-Sandbox URLs</h4>
                  <p className="text-[10px] text-on-surface-variant">Isolates suspicious domains automatically</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.auto_sandbox}
                    onChange={() => handleToggle('auto_sandbox')}
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-3 border border-white/5 rounded-lg bg-white/5">
                <div>
                  <h4 className="font-mono-data text-sm text-on-surface">Threat Intelligence Feed</h4>
                  <p className="text-[10px] text-on-surface-variant">Real-time sync with Global SOC</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.threat_intel_feed}
                    onChange={() => handleToggle('threat_intel_feed')}
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>
            </div>
          </GlassCard>

          {/* Card 2: Daily Usage */}
          <GlassCard className="p-md flex flex-col items-center justify-center text-center">
            <div className="w-full flex items-center justify-between mb-8">
              <h3 className="font-h3 text-xl text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container">query_stats</span>
                Usage Analytics
              </h3>
            </div>
            <div className="relative w-48 h-48 flex items-center justify-center mb-6">
              {/* Circular Progress Ring (SVG) */}
              <svg className="w-full h-full -rotate-90">
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="var(--primary-container)" />
                  </linearGradient>
                </defs>
                <circle 
                  className="text-white/5" 
                  cx="96" cy="96" fill="transparent" r="88" 
                  stroke="currentColor" strokeWidth="8" 
                ></circle>
                <circle
                  className="filter drop-shadow-[0_0_12px_rgba(255,193,7,0.3)]"
                  cx="96" cy="96" fill="transparent" r="88" 
                  stroke="url(#progressGradient)"
                  strokeDasharray="552.92"
                  strokeDashoffset={552.92 - (552.92 * (usage.used / usage.limit))}
                  strokeLinecap="round" strokeWidth="12"
                  style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
                ></circle>
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="font-h1 text-5xl text-on-surface font-bold tracking-tighter">
                  {usage.used.toLocaleString()}
                </span>
                <div className="flex flex-col items-center opacity-60">
                  <span className="font-label-caps text-[10px] uppercase tracking-widest text-primary-container">Total Scans</span>
                  <span className="text-[10px] font-mono-data">/ 14,400 LIMIT</span>
                </div>
              </div>
            </div>
            <div className="w-full grid grid-cols-2 gap-4 mt-auto">
              <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                <p className="text-[10px] font-label-caps text-slate-400 uppercase mb-1">Scanned Today</p>
                <p className="font-h3 text-xl text-primary">{stats.totalScanned.toLocaleString()}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                <p className="text-[10px] font-label-caps text-slate-400 uppercase mb-1">Threats Blocked</p>
                <p className="font-h3 text-xl text-tertiary">{stats.threatsBlocked.toLocaleString()}</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Bottom Row: Allowlist & Blocklist */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter text-left">
          {/* Card 1: Allowlist */}
          <GlassCard className="p-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-h3 text-xl text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container">verified_user</span>
                Manage Allowlist
              </h3>
              <button
                onClick={async () => {
                  const url = prompt('Enter URL pattern to allow (e.g., *.google.com):');
                  if (url && !allowlist.includes(url)) {
                    setAllowlist([...allowlist, url]);
                    await fetch('/api/user/settings/update_list', {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user.token}`
                      },
                      body: JSON.stringify({ listType: 'allowlist', url })
                    });
                  }
                }}
                className="text-primary-container hover:bg-primary-container/10 p-2 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
            <ul className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {allowlist.length === 0 ? (
                <li className="text-center py-10 text-slate-500 text-sm italic">No entries in allowlist</li>
              ) : (
                allowlist.map((site, i) => (
                  <li key={i} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg group transition-colors border border-transparent hover:border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-on-tertiary-container/60 text-sm">link</span>
                      <span className="font-mono-data text-sm text-on-surface truncate max-w-[200px]">{site}</span>
                    </div>
                    <button
                      onClick={() => removeFromList('allowlist', site)}
                      className="opacity-0 group-hover:opacity-100 text-error p-1 hover:bg-error/10 rounded transition-all"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </GlassCard>

          {/* Card 2: Blocked Bin */}
          <GlassCard className="p-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-h3 text-xl text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-error">block</span>
                Blocked domains
              </h3>
              <button
                onClick={async () => {
                  const url = prompt('Enter URL pattern to block:');
                  if (url && !bin.includes(url)) {
                    setBin([...bin, url]);
                    await fetch('/api/user/settings/update_list', {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user.token}`
                      },
                      body: JSON.stringify({ listType: 'bin', url })
                    });
                  }
                }}
                className="text-error hover:bg-error/10 p-2 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
            <ul className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {bin.length === 0 ? (
                <li className="text-center py-10 text-slate-500 text-sm italic">No entries in blocklist</li>
              ) : (
                bin.map((site, i) => (
                  <li key={i} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg group transition-colors border border-transparent hover:border-white/5">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-error/60 text-sm">dangerous</span>
                      <span className="font-mono-data text-sm text-on-surface truncate max-w-[200px]">{site}</span>
                    </div>
                    <button
                      onClick={() => removeFromList('bin', site)}
                      className="opacity-0 group-hover:opacity-100 text-on-surface-variant p-1 hover:bg-white/10 rounded transition-all"
                    >
                      <span className="material-symbols-outlined text-lg">undo</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </GlassCard>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
