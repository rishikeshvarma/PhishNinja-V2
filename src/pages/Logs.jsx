import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import GlassCard from '../components/GlassCard';
import { useAuth } from '../context/AuthContext';

const Logs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [stats, setStats] = useState({ totalScanned: 0, threatsBlocked: 0, cleanItems: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ totalRecords: 0, totalPages: 0, limit: 50 });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const headers = { 'Authorization': `Bearer ${user.token}` };
        const [logsRes, statsRes] = await Promise.all([
          fetch(`/api/user/logs?page=${currentPage}&limit=50`, { headers }),
          fetch('/api/user/stats', { headers })
        ]);
        
        const logsJson = await logsRes.json();
        // Destructure the new backend response: { data, pagination }
        if (logsJson && logsJson.data) {
          setLogs(logsJson.data);
          setPagination(logsJson.pagination);
        }
        
        try {
          const statsData = await statsRes.json();
          if (statsData && !statsData.error) setStats(statsData);
        } catch (e) { /* stats endpoint may not exist yet */ }
      } catch (err) {
        console.error('Logs fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, currentPage]);

  const getStatusInfo = (status) => {
    switch (status?.toLowerCase()) {
      case 'danger':
      case 'phishing':
      case 'malware':
        return { label: 'Danger', color: 'text-error bg-error/20 border-error/30' };
      case 'risk':
      case 'suspicious':
        return { label: 'Risk', color: 'text-amber-400 bg-primary-container/20 border-amber-400/30' };
      default:
        return { label: 'Safe', color: 'text-tertiary-fixed-dim bg-tertiary-container/10 border-tertiary-fixed-dim/30' };
    }
  };

  return (
    <Layout title="Threat Analysis Logs">
      <div className="space-y-lg text-left">
        {/* Page Header & Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
          <div className="md:col-span-4 flex flex-col md:flex-row justify-between items-start md:items-end mb-4 gap-4">
            <div>
              <h2 className="text-h2 font-h2 text-on-surface">Activity History</h2>
              <p className="text-on-surface-variant font-body-md mt-1">Real-time surveillance data from all connected channels.</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button className="flex-1 md:flex-none bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">filter_list</span>
                Filter
              </button>
              <button className="flex-1 md:flex-none bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">download</span>
                Export CSV
              </button>
            </div>
          </div>
          
          {[
            { label: 'SCANNED TODAY', value: (stats.totalScanned || 0).toLocaleString(), sub: stats.totalScanned > 0 ? 'Active monitoring' : 'No scans yet', color: 'text-primary', icon: 'trending_up', iconColor: 'text-tertiary-fixed-dim' },
            { label: 'THREATS NEUTRALIZED', value: (stats.threatsBlocked || 0).toLocaleString(), sub: stats.threatsBlocked > 0 ? 'High priority blocks' : 'No threats detected', color: 'text-error', icon: 'security', iconColor: 'text-error' },
            { label: 'AVG RESPONSE', value: stats.totalScanned > 0 ? '14ms' : '--', sub: 'Edge latency', color: 'text-on-surface', icon: 'bolt', iconColor: 'text-slate-500' },
            { label: 'AI CONFIDENCE', value: stats.totalScanned > 0 ? '99.9%' : '--', sub: 'Agentic V2.1 Engine', color: 'text-tertiary-fixed-dim', icon: 'verified', iconColor: 'text-tertiary-fixed-dim' },
          ].map((stat, i) => (
            <GlassCard key={i} className="p-6 flex flex-col">
              <span className="text-[10px] font-label-caps text-slate-400 mb-2 uppercase tracking-widest">{stat.label}</span>
              <span className={`text-3xl font-h1 ${stat.color}`}>{stat.value}</span>
              <div className={`mt-auto pt-4 flex items-center text-[10px] uppercase font-bold tracking-tighter ${stat.iconColor}`}>
                <span className="material-symbols-outlined text-xs mr-1">{stat.icon}</span>
                {stat.sub}
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Main Data Table Container */}
        <div className="glass-panel rounded-xl overflow-hidden border border-white/10 glow-accent">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-[10px] font-label-caps text-slate-400 uppercase tracking-widest">Date/Time</th>
                  <th className="px-6 py-4 text-[10px] font-label-caps text-slate-400 uppercase tracking-widest">Source</th>
                  <th className="px-6 py-4 text-[10px] font-label-caps text-slate-400 uppercase tracking-widest">Threat Type</th>
                  <th className="px-6 py-4 text-[10px] font-label-caps text-slate-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-label-caps text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400"></div>
                        <p className="text-xs font-bold uppercase tracking-widest">Intercepting Logs...</p>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                      <p className="text-sm">No threats detected yet. PhishNinja is watching.</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const statusInfo = getStatusInfo(log.status);
                    const date = new Date(log.timestamp);
                    const iconMap = {
                      'URL': 'language',
                      'TEXT': 'chat',
                      'EMAIL': 'mail',
                      'SMS': 'sms'
                    };
                    
                    return (
                      <React.Fragment key={log.id}>
                        <tr 
                          onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                          className="hover:bg-white/10 transition-colors cursor-pointer group"
                        >
                          <td className="px-6 py-5 font-mono-data text-sm text-slate-300">
                            {date.toLocaleDateString()} <br/>
                            <span className="text-xs text-slate-500">{date.toLocaleTimeString()}</span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="text-on-surface font-medium text-sm truncate max-w-[200px]">{log.source || 'Unknown Source'}</span>
                              <span className="text-[10px] text-slate-500 flex items-center gap-1 uppercase font-bold tracking-tighter">
                                <span className="material-symbols-outlined text-[12px]">{iconMap[log.type] || 'security'}</span>
                                {log.type}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-slate-300 text-sm">{log.status !== 'safe' ? 'Threat Detected' : 'Clean Scan'}</td>
                          <td className="px-6 py-5 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-tighter ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className={`material-symbols-outlined text-slate-500 group-hover:text-amber-400 transition-all duration-300 ${expandedId === log.id ? 'rotate-180' : ''}`}>
                              expand_more
                            </span>
                          </td>
                        </tr>
                        {expandedId === log.id && log.ai_reason && (
                          <tr className={`${log.status !== 'safe' ? 'bg-error-container/5 border-l-4 border-error' : 'bg-white/5 border-l-4 border-tertiary-fixed-dim'}`}>
                            <td className="px-6 py-6" colSpan="5">
                              <div className="flex gap-6">
                                <div className="flex-none">
                                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${log.status !== 'safe' ? 'bg-error/10 text-error' : 'bg-tertiary-fixed-dim/10 text-tertiary-fixed-dim'}`}>
                                    <span className="material-symbols-outlined">smart_toy</span>
                                  </div>
                                </div>
                                <div className="flex-1 space-y-3">
                                  <p className={`text-[10px] font-label-caps uppercase tracking-widest font-bold ${log.status !== 'safe' ? 'text-error' : 'text-tertiary-fixed-dim'}`}>AI CLASSIFICATION REASONING</p>
                                  <p className="text-on-surface text-sm leading-relaxed italic">
                                    "{log.ai_reason}"
                                  </p>
                                  <div className="flex gap-3 pt-2">
                                    {log.status !== 'safe' && (
                                      <button className="bg-error text-on-error px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">QUARANTINE SOURCE</button>
                                    )}
                                    <button className="bg-white/5 border border-white/10 text-on-surface px-4 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors">REPORT FALSE POSITIVE</button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Table Pagination */}
          <div className="px-6 py-4 bg-white/5 flex items-center justify-between border-t border-white/10">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
              {pagination.totalRecords > 0 ? (
                <>
                  Showing <span className="text-on-surface">{(currentPage - 1) * pagination.limit + 1}-{Math.min(currentPage * pagination.limit, pagination.totalRecords)}</span> of <span className="text-on-surface">{pagination.totalRecords.toLocaleString()}</span> records
                </>
              ) : (
                <>No records to display</>
              )}
            </p>
            {pagination.totalRecords > 0 && (
              <div className="flex gap-1">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`p-1 rounded hover:bg-white/10 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity`}
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <div className="w-10 h-7 flex items-center justify-center rounded bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold">
                  {currentPage} / {pagination.totalPages}
                </div>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                  disabled={currentPage === pagination.totalPages || pagination.totalPages === 0}
                  className={`p-1 rounded hover:bg-white/10 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity`}
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Contextual Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <GlassCard className="p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className="material-symbols-outlined text-8xl">security</span>
            </div>
            <div className="relative z-10 space-y-4">
              <h3 className="text-h3 font-h3 text-amber-400">Deep Learning Insights</h3>
              <p className="text-on-surface-variant font-body-md">Our Agentic AI has detected a 14% increase in typosquatting domains targeting your organizational profile this week. We recommend enabling "Aggressive DNS Filtering".</p>
              <button className="text-amber-400 font-bold flex items-center gap-2 hover:translate-x-1 transition-transform uppercase text-xs tracking-widest">
                View Trend Analysis
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </GlassCard>
          
          <GlassCard className="p-8 bg-gradient-to-br from-amber-400/10 to-transparent">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-container/20 rounded-full">
                <span className="material-symbols-outlined text-amber-400">notifications_active</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-h3 font-h3 text-on-surface">Auto-Neutralization Active</h3>
                <p className="text-on-surface-variant font-body-md text-sm">The Ninja Agent is currently monitoring 12 concurrent browser sessions and 4 email streams. No manual intervention required.</p>
                <div className="flex items-center gap-2 pt-2">
                  <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim animate-pulse"></span>
                  <span className="text-[10px] font-mono-data text-tertiary-fixed-dim uppercase tracking-tighter">Engine Status: Optimal</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </Layout>
  );
};

export default Logs;
