import { getEmbedding, safeParseLLMJSON } from '../_utils/ai.js';
import { query } from '../_utils/db.js';
import { logDetection } from '../_utils/scanner.js';
import { extractUserIdFromToken } from '../_utils/auth.js';
import { ensureUserOnboarded } from '../_utils/user.js';
import axios from 'axios';
import Groq from 'groq-sdk';

let groq = null;
function getGroqClient() {
  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groq;
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;
  const userId = extractUserIdFromToken(req);
  const authHeader = req.headers?.authorization;

  // Directive 1: Ensure user is onboarded if a valid token exists
  if (userId && userId !== 'guest_user' && authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      await ensureUserOnboarded(userId, token);
    } catch (err) {
      console.warn('[PhishNinja URL] Auto-onboarding failed:', err.message);
    }
  }

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Consolidated Logging Helper
  const logBeautifulScan = ({ url, score, tier, verdict, reason }) => {
    console.log('\n=============================================');
    console.log('[PhishNinja URL] 📩 Incoming Scan Request');
    console.log(`[PhishNinja URL] URL: ${url}`);
    console.log(`[PhishNinja URL] 🧮 Vector Similarity Score: ${score !== undefined ? score.toFixed(4) : 'N/A'}`);
    console.log(`[PhishNinja URL] ${tier}`);
    console.log(`[PhishNinja URL] 🧠 Verdict: ${verdict} | Reason: ${reason}`);
    console.log('=============================================\n');
  };

  // 2. Whitelist Bypass Failsafe
  const trusted = ['google.com', 'instagram.com', 'whatsapp.com', 'linkedin.com', 'facebook.com', 'github.com', 'microsoft.com', 'apple.com'];
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    if (trusted.some(t => hostname === t || hostname.endsWith('.' + t))) {
      const whitelistReason = 'Domain is verified as a trusted platform via absolute whitelist.';
      await logDetection(userId, 'URL', 'safe', 'Kill-Switch', whitelistReason, url);

      logBeautifulScan({
        url,
        score: 0,
        tier: '✅ KILL-SWITCH: Trusted domain bypass.',
        verdict: 'Safe',
        reason: whitelistReason
      });
      return res.status(200).json({
        status: 'safe',
        riskLevel: 'Safe',
        source: 'kill-switch',
        ai_reason: whitelistReason
      });
    }
  } catch (e) {
    // Invalid URL format, proceed to security checks
  }

  try {
    // 3. Google Safe Browsing (GSB) Check (First Tier)
    const safeBrowsingKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
    if (safeBrowsingKey) {
      const sbUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${safeBrowsingKey}`;
      const sbBody = {
        client: { clientId: "phishninja", clientVersion: "1.0.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }]
        }
      };

      try {
        const sbResponse = await axios.post(sbUrl, sbBody);
        if (sbResponse.data.matches && sbResponse.data.matches.length > 0) {
          const gsbReason = "Google Safe Browsing API actively flagged this URL as a known security threat.";
          await logDetection(userId, 'URL', 'danger', 'Google Safe Browsing', gsbReason, url);

          logBeautifulScan({
            url,
            score: 1.0,
            tier: '🚨 GSB MATCH: Confirmed threat via Google Safe Browsing.',
            verdict: 'Danger',
            reason: gsbReason
          });
          return res.status(200).json({
            status: 'danger',
            riskLevel: 'Danger',
            source: 'Google Safe Browsing',
            ai_reason: gsbReason
          });
        }
      } catch (gsbError) {
        console.error('[GSB Error] Skipping GSB check:', gsbError.message);
      }
    }

    // 4. Vector Store Match (Tiered Routing)
    const embedding = await getEmbedding(url);
    const vectorSearchQuery = `
      SELECT content, status, reason, (1 - (embedding_local <=> $1::vector)) as similarity
      FROM phishninja_vectors
      WHERE threat_type = 'URL'
      ORDER BY similarity DESC
      LIMIT 1;
    `;
    
    const { rows } = await query(vectorSearchQuery, [JSON.stringify(embedding)]);
    const score = rows.length > 0 ? rows[0].similarity : 0;

    let finalVerdict = 'safe';
    let finalRiskLevel = 'Safe';
    let finalReason = '';
    let finalSource = 'Security Engine';
    let tierDisplay = '';

    if (score >= 0.85) {
      // --- TIER 1: Known Threat ---
      finalVerdict = 'danger';
      finalRiskLevel = 'Danger';
      finalReason = rows[0].reason || "Matched a known malicious pattern with high confidence.";
      finalSource = 'Vector DB';
      tierDisplay = '🚨 TIER 1 MATCH: Known threat detected in Vector DB.';
    } else if (score >= 0.72) {
      // --- TIER 2: Suspicious Pattern (Novel Threat) ---
      finalVerdict = 'risk';
      finalRiskLevel = 'Risk';
      finalSource = 'Vector DB + Groq';
      tierDisplay = '⚠️ TIER 2 MATCH: Suspicious pattern. Sent to Groq AI.';

      const contextText = `Historical Context: A similar URL was previously matched with ${(score * 100).toFixed(1)}% similarity. Matched Content: "${rows[0].content}". Previous Status: "${rows[0].status || 'N/A'}"`;

      const systemPrompt = `You are an elite PhishNinja URL Analyst. Analyze the provided URL for phishing, typosquatting, and deceptive patterns.
Rules:
- Provide a technical explanation of why this URL is suspicious.
- Keep the reason concise (1-2 sentences).
Respond ONLY with a valid JSON object:
{ "ai_reason": "Technical explanation of the threat." }`;

      const userPrompt = `URL to analyze: ${url}\n\n${contextText}`;

      try {
        const groqClient = getGroqClient();
        const chatCompletion = await groqClient.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          model: "llama-3.1-8b-instant",
          response_format: { type: "json_object" },
        });

        const aiOutput = chatCompletion.choices[0]?.message?.content;
        const data = safeParseLLMJSON(aiOutput);
        finalReason = data?.ai_reason || "AI reasoning failed. URL matches a suspicious pattern.";
      } catch (groqError) {
        console.error('[Groq Error] Falling back to deterministic reason:', groqError.message);
        finalReason = `Vector Match detected suspicious similarity (${(score * 100).toFixed(1)}%) to known malicious patterns.`;
      }
    } else {
      // --- TIER 3: Safe ---
      finalVerdict = 'safe';
      finalRiskLevel = 'Safe';
      finalReason = "The URL passed all security risk checks. No threats detected.";
      finalSource = 'Security Engine';
      tierDisplay = '✅ TIER 3 MATCH: URL is Safe. Bypassing Groq.';
    }

    // 5. Final Database Logging
      await logDetection(userId, 'URL', finalVerdict, finalSource, finalReason, url);


    logBeautifulScan({
      url,
      score,
      tier: tierDisplay,
      verdict: finalRiskLevel,
      reason: finalReason
    });

    return res.status(200).json({
      status: finalVerdict,
      riskLevel: finalRiskLevel,
      source: finalSource,
      ai_reason: finalReason
    });

  } catch (error) {
    console.error('[PhishNinja URL] Scan Error:', error.message);
    const errorReason = "Scan service encountered an error. Defaulting to safe.";
    logBeautifulScan({
      url,
      score: 0,
      tier: '❌ ERROR: System failure.',
      verdict: 'Safe',
      reason: errorReason
    });
    return res.status(200).json({
      status: 'safe',
      riskLevel: 'Safe',
      source: 'error-fallback',
      ai_reason: errorReason
    });
  }
}
