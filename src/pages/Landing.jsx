import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const Landing = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLoginSuccess = (credentialResponse) => {
    if (credentialResponse.credential) {
      login(credentialResponse.credential);
    }
  };

  const handleLoginError = () => {
    console.error('Login Failed');
  };

  return (
    <div className="bg-background text-on-surface font-body-md selection:bg-primary-container selection:text-on-primary-container min-h-screen">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 z-50 bg-slate-900/40 backdrop-blur-md flex justify-between items-center w-full px-6 h-16 border-b border-white/10 shadow-[0_0_15px_rgba(255,193,7,0.1)]">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-amber-400 tracking-tight font-h1">PhishNinja</span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <button onClick={() => navigate('/dashboard')} className="text-amber-400 font-h1 font-medium hover:bg-white/5 transition-colors px-3 py-2 rounded">Dashboard</button>
          <button onClick={() => navigate('/logs')} className="text-slate-400 font-h1 font-medium hover:bg-white/5 transition-colors px-3 py-2 rounded">Logs</button>
          <button onClick={() => navigate('/settings')} className="text-slate-400 font-h1 font-medium hover:bg-white/5 transition-colors px-3 py-2 rounded">Settings</button>
        </nav>
        <div className="flex items-center gap-4">
          <button className="material-symbols-outlined text-slate-400 hover:bg-white/5 p-2 rounded-full transition-colors">
            settings_input_antenna
          </button>
        </div>
      </header>

      <main className="hero-gradient pt-16 flex flex-col items-center">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-container-margin py-xl flex flex-col items-center text-center">
          <div className="mb-lg relative">
            <div className="absolute inset-0 bg-primary-container/20 blur-3xl rounded-full"></div>
            <img 
              alt="PhishNinja Logo" 
              className="w-32 h-32 md:w-48 md:h-48 relative z-10 drop-shadow-[0_0_30px_rgba(255,193,7,0.3)]" 
              src="/icon.png" 
            />
          </div>
          <h1 className="font-h1 text-h1 text-on-surface mb-md max-w-4xl tracking-tighter">
            Real-Time Phishing Defense powered by <span className="text-primary-container">Agentic AI</span>
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-lg">
            The silent guardian of your digital communications. PhishNinja v2.0 deploys autonomous agents to neutralize deceptive threats before they reach your inbox, utilizing state-of-the-art neural heuristics.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 items-center justify-center">
            <div className="glass-panel p-1 rounded-lg overflow-hidden border border-white/20">
              <GoogleLogin
                onSuccess={handleLoginSuccess}
                onError={handleLoginError}
                useOneTap
                theme="filled_black"
                shape="pill"
                size="large"
                text="continue_with"
              />
            </div>
            <button className="font-label-caps text-label-caps uppercase tracking-widest border border-primary-container text-primary-container px-8 py-3.5 rounded-xl hover:bg-primary-container/10 transition-all">
              View Documentation
            </button>
          </div>
        </section>

        {/* Bento Grid Features */}
        <section className="w-full max-w-7xl px-container-margin py-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
            {/* Main Detection Card */}
            <div className="md:col-span-8 glass-panel p-md rounded-xl flex flex-col justify-between overflow-hidden relative">
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-primary-container mb-sm">
                  <span className="material-symbols-outlined">security</span>
                  <span className="font-label-caps text-label-caps">LIVE DETECTION ENGINE</span>
                </div>
                <h3 className="font-h3 text-h3 mb-base text-on-surface text-left">Agentic Intelligence</h3>
                <p className="text-on-surface-variant text-left">Our AI agents don't just scan; they reason. By analyzing semantic context and sender reputation in real-time, PhishNinja eliminates false positives.</p>
              </div>
              <div className="mt-lg flex justify-end">
                <div className="w-64 h-32 glass-panel border-dashed border-white/20 rounded-lg flex items-center justify-center">
                  <div className="animate-pulse flex items-center gap-2 text-primary-container/60">
                    <span className="material-symbols-outlined">radar</span>
                    <span className="font-mono-data text-mono-data">Scanning for threats...</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Small Info Card */}
            <div className="md:col-span-4 glass-panel p-md rounded-xl hover:bg-white/10 transition-all duration-300 border-white/10 text-left">
              <div className="h-12 w-12 rounded-lg bg-primary-container/10 flex items-center justify-center text-primary-container mb-md border border-primary-container/20">
                <span className="material-symbols-outlined">bolt</span>
              </div>
              <h3 className="font-h3 text-h3 mb-base text-on-surface">Zero Latency</h3>
              <p className="text-on-surface-variant text-sm">Deployment happens at the edge. Experience military-grade security without a single millisecond of delay to your workflow.</p>
            </div>
            {/* Third Card */}
            <div className="md:col-span-4 glass-panel p-md rounded-xl border-white/10 text-left">
              <div className="h-12 w-12 rounded-lg bg-tertiary-container/10 flex items-center justify-center text-tertiary mb-md border border-tertiary/20">
                <span className="material-symbols-outlined">hub</span>
              </div>
              <h3 className="font-h3 text-h3 mb-base text-on-surface">Mesh Network</h3>
              <p className="text-on-surface-variant text-sm">Every PhishNinja node shares threat intelligence instantly across the global mesh, creating an immune system for the internet.</p>
            </div>
            {/* Large Stats Card */}
            <div className="md:col-span-8 glass-panel p-md rounded-xl flex flex-col md:flex-row items-center gap-lg border-white/10 text-left">
              <div className="flex-1">
                <h3 className="font-h2 text-6xl text-primary-container mb-xs">99.9%</h3>
                <p className="font-label-caps text-label-caps text-on-surface-variant">THREAT NEUTRALIZATION RATE</p>
                <p className="mt-md text-on-surface-variant">Validated by independent security audits. PhishNinja v2.0 represents a quantum leap in preemptive defense architectures.</p>
              </div>
              <div className="flex gap-4">
                {[80, 100, 75, 83].map((height, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-1 px-4 h-24 bg-white/5 rounded-full overflow-hidden relative">
                      <div className="absolute bottom-0 left-0 right-0 bg-primary-container" style={{ height: `${height}%` }}></div>
                    </div>
                    <span className="text-[10px] mt-2 font-mono-data opacity-40">{['M', 'T', 'W', 'T'][i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-amber-400 font-bold font-h1 text-lg mb-2">PhishNinja AI</span>
            <p className="font-h1 text-sm text-slate-500 text-center md:text-left">
              The next evolution in cybersecurity. Agentic AI patrolling the digital frontier.
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-12 text-left">
            <div className="flex flex-col gap-3">
              <span className="font-label-caps text-label-caps text-on-surface opacity-60">RESOURCES</span>
              <a className="font-h1 text-sm text-slate-500 hover:text-amber-300 transition-colors" href="#">Security Documentation</a>
              <a className="font-h1 text-sm text-slate-500 hover:text-amber-300 transition-colors" href="#">API Reference</a>
            </div>
            <div className="flex flex-col gap-3">
              <span className="font-label-caps text-label-caps text-on-surface opacity-60">LEGAL</span>
              <a className="font-h1 text-sm text-slate-500 hover:text-amber-300 transition-colors" href="#">Privacy Policy</a>
              <a className="font-h1 text-sm text-slate-500 hover:text-amber-300 transition-colors" href="#">Terms of Service</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-8 mt-12 pt-8 border-t border-white/5 text-center">
          <p className="font-h1 text-sm text-slate-500">
            © 2024 PhishNinja AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
