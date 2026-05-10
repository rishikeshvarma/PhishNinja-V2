import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';

// Import Vercel API handlers
import syncHandler from './api/user/sync.js';
import profileHandler from './api/user/profile.js';
import settingsHandler from './api/user/settings/index.js';
import statsHandler from './api/user/stats.js';
import logsHandler from './api/user/logs.js';
import urlScanHandler from './api/scan/url.js';
import textScanHandler from './api/scan/text.js';
import ragScanHandler from './api/scan/rag.js';
import updateListHandler from './api/user/settings/update_list.js';
import removeListHandler from './api/user/settings/remove_list.js';

const app = express();
const port = 3001;

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'chrome-extension://afdnklgpaibjlgekddhnpnefkpaogcfc',
      'chrome-extension://lnibnpolceadeabogmhpmmfpnfmcfhgg'
    ];
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('chrome-extension://')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// Wrapper to adapt Vercel serverless functions to Express
const adapt = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    console.error('API Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
};

// Global state for usage tracking
global.dailyUsageCount = 0;

// Route Mapping
app.all('/api/user/sync', adapt(syncHandler));
app.all('/api/user/profile', adapt(profileHandler));
app.all('/api/user/settings', adapt(settingsHandler));
app.all('/api/user/stats', adapt(statsHandler));
app.all('/api/user/logs', adapt(logsHandler));
app.all('/api/scan/url', adapt(urlScanHandler));
app.all('/api/scan/text', adapt(textScanHandler));
app.all('/api/scan/rag', adapt(ragScanHandler));
app.all('/api/user/settings/update_list', adapt(updateListHandler));
app.all('/api/user/settings/remove_list', adapt(removeListHandler));

app.get('/api/usage', (req, res) => {
  res.json({
    used: global.dailyUsageCount || 0,
    limit: 14400
  });
});

app.post('/api/log', (req, res) => {
  const { message, data, timestamp = new Date().toISOString() } = req.body;
  
  if (message.includes('[RAG Scan] Complete')) {
    const score = data?.score || 0;
    const tier = data?.tier || 'Safe';
    const reason = data?.reason || 'None';
    const domain = data?.domain || 'Remote Extension';
    
    console.log('\n=============================================');
    console.log('[PhishNinja Log] 📩 RAG Result Bridge');
    console.log(`[PhishNinja Log] Source: ${domain}`);
    console.log(`[PhishNinja Log] 🧮 Vector Similarity Score: ${score}`);
    console.log(`[PhishNinja Log] TIER: ${tier}`);
    console.log(`[PhishNinja Log] 🧠 Verdict: ${tier} | Reason: ${reason}`);
    console.log('=============================================\n');
  } else if (message.includes('[Kill-Switch]')) {
    console.log(`[PhishNinja Log] 🛡️ ${message}`);
  } else {
    console.log(`[PhishNinja Log] [${timestamp}] ${message}`);
    if (data && Object.keys(data).length > 0 && !data.score) {
      // Log non-result data cleanly
      console.log('[PhishNinja Log] Context:', JSON.stringify(data));
    }
  }
  res.json({ success: true });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Local API Server is breathing' });
});

app.listen(port, () => {
  console.log(`\n🚀 Local API Server running at http://localhost:${port}`);
  console.log(`🔗 Proxying /api requests from Vite to this server\n`);
});
