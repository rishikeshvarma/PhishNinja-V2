import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import GlassCard from '../components/GlassCard';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, extensionConnected } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const headers = { 'Authorization': `Bearer ${user.token}` };
        const [statsRes, logsRes] = await Promise.all([
          fetch(`/api/user/stats?userId=${user.id}`, { headers }),
          fetch(`/api/user/logs?limit=5`, { headers })
        ]);
        const statsData = await statsRes.json();
        setStats(statsData);
        try {
          const result = await logsRes.json();
          const logsData = result.data || [];
          setRecentLogs(logsData.slice(0, 5));
        } catch (e) { /* logs endpoint may not exist yet */ }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);
  
  return (
    <Layout title="Dashboard Overview">
      {/* Greeting & Warning Section */}
      <div className="mb-10 text-left">
        <h2 className="font-h2 text-4xl text-on-surface mb-2">Welcome back, <span className="text-amber-400">{user?.name || 'Security Lead'}</span></h2>
        <p className="text-on-surface-variant font-body-lg">PhishNinja v2.1 is actively monitoring your connected channels.</p>
      </div>

      {/* Warning Banner (Dynamic) */}
      {!extensionConnected && (
        <div className="mb-8 glass-panel p-6 rounded-2xl flex items-center gap-4 bg-error-container/10 border-error-container/30 text-left animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="w-12 h-12 rounded-xl bg-amber-400/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-amber-400" style={{ fontVariationSettings: '"FILL" 1' }}>warning</span>
          </div>
          <div className="flex-1">
            <h3 className="font-h3 text-base text-amber-400">Security Recommendation</h3>
            <p className="text-sm text-on-surface-variant">Install the Extension to enable real-time protection across all browsing sessions.</p>
          </div>
          <button 
            onClick={() => window.location.href = 'https://chromewebstore.google.com/detail/ikcooobnaejnjglfncihcjjpalcgjhmb?utm_source=item-share-cb'}
            className="px-6 py-2 bg-white/5 border border-white/10 text-on-surface rounded-lg text-sm font-bold hover:bg-white/10 transition-colors"
          >
            Install Now
          </button>
        </div>
      )}

      {/* Bento Grid Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left">
        {/* Card 1 */}
        <GlassCard glow className="p-6 relative overflow-hidden group min-h-[160px]">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl">travel_explore</span>
          </div>
          <p className="text-slate-400 font-label-caps text-label-caps mb-4 uppercase tracking-widest">Total Scanned</p>
          {loading ? (
            <div className="h-10 w-24 bg-white/5 animate-pulse rounded"></div>
          ) : (
            <>
              <h4 className="text-4xl font-h1 text-on-surface mb-1">{stats?.totalScanned?.toLocaleString() || '0'}</h4>
              <div className="flex items-center gap-2 text-emerald-400 text-xs">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                <span className="">Active Monitoring</span>
              </div>
            </>
          )}
        </GlassCard>

        {/* Card 2 */}
        <GlassCard className="p-6 relative overflow-hidden group min-h-[160px]">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl">gpp_maybe</span>
          </div>
          <p className="text-slate-400 font-label-caps text-label-caps mb-4 uppercase tracking-widest">Threats Blocked</p>
          {loading ? (
            <div className="h-10 w-24 bg-white/5 animate-pulse rounded"></div>
          ) : (
            <>
              <h4 className="text-4xl font-h1 text-amber-400 mb-1">{stats?.threatsBlocked || '0'}</h4>
              <div className="flex items-center gap-2 text-amber-500/70 text-xs">
                <span className="material-symbols-outlined text-sm">verified_user</span>
                <span className="">100% Mitigated</span>
              </div>
            </>
          )}
        </GlassCard>

        {/* Card 3 */}
        <GlassCard className="p-6 relative overflow-hidden group min-h-[160px]">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-6xl">task_alt</span>
          </div>
          <p className="text-slate-400 font-label-caps text-label-caps mb-4 uppercase tracking-widest">Clean Items</p>
          {loading ? (
            <div className="h-10 w-24 bg-white/5 animate-pulse rounded"></div>
          ) : (
            <>
              <h4 className="text-4xl font-h1 text-on-surface mb-1">{stats?.cleanItems?.toLocaleString() || '0'}</h4>
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <span className="material-symbols-outlined text-sm">shield</span>
                <span className="">Authenticated Sources</span>
              </div>
            </>
          )}
        </GlassCard>
      </div>

      {/* Agentic Scanning Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
        <GlassCard className="rounded-3xl p-8 border-amber-400/20">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-h3 text-h3 text-on-surface">Detection HUD</h3>
            <span className="px-3 py-1 bg-amber-400/10 text-amber-400 text-[10px] font-bold rounded-full border border-amber-400/20 uppercase">Real-time Active</span>
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative w-48 h-48 flex items-center justify-center">
              {/* Animated Scanning Ring */}
              <div className="absolute inset-0 border-4 border-amber-400/10 rounded-full"></div>
              <div className="absolute inset-0 border-t-4 border-amber-400 rounded-full animate-spin"></div>
              <div className="text-center">
                <span className="material-symbols-outlined text-5xl text-amber-400 mb-2">radar</span>
                <p className="text-[10px] font-mono-data uppercase tracking-tighter text-slate-500">Scanning Network...</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {!loading && (!stats?.totalScanned || stats.totalScanned === 0) ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <span className="material-symbols-outlined text-3xl text-slate-600 mb-2">shield</span>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Awaiting scan data</p>
                <p className="text-[10px] text-slate-600 mt-1">Detections will appear here in real-time</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <span className="material-symbols-outlined text-3xl text-amber-400/60 mb-2">pending</span>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Processing scan queue...</p>
              </div>
            )}
          </div>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="rounded-3xl p-8">
            <h3 className="font-h3 text-h3 text-on-surface mb-6">Recent Activity</h3>
            <div className="space-y-6">
              {loading ? (
                <div className="flex flex-col items-center py-8 gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-amber-400"></div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Loading...</p>
                </div>
              ) : recentLogs.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-slate-600 mb-3">history</span>
                  <p className="text-sm text-slate-500">No recent activity yet.</p>
                  <p className="text-[10px] text-slate-600 mt-1">Scanned items and detections will show up here.</p>
                </div>
              ) : (
                recentLogs.map((log, i) => {
                  const isDanger = log.status === 'danger' || log.status === 'phishing';
                  const isRisk = log.status === 'risk' || log.status === 'suspicious';
                  return (
                    <div key={log.id || i} className="flex gap-4 items-start">
                      <div className={`w-2 h-2 rounded-full ${isDanger ? 'bg-red-500' : isRisk ? 'bg-amber-400' : 'bg-slate-700'} mt-2`}></div>
                      <div>
                        <p className="text-sm text-on-surface font-medium">{log.source || 'Unknown scan'}</p>
                        <p className="text-xs text-slate-500">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''} • {log.type || 'Scan'}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <button onClick={() => window.location.href = '/logs'} className="w-full mt-8 py-3 border border-white/10 rounded-xl text-slate-400 text-sm font-bold hover:bg-white/5 transition-colors">View All Logs</button>
          </GlassCard>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
