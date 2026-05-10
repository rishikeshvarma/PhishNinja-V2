import { getEmbedding, safeParseLLMJSON } from '../_utils/ai.js';
import { query } from '../_utils/db.js';
import { logDetection } from '../_utils/scanner.js';
import { extractUserIdFromToken } from '../_utils/auth.js';
import Groq from 'groq-sdk';

let groq = null;
function getGroqClient() {
  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groq;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }



  const incomingText = req.body.text || req.body.content || '';

  // Strict Failsafe: Drop empty or extremely short text (spam prevention)
  if (!incomingText || incomingText.trim().length < 15) {
    console.log('[PhishNinja Text] 🛑 Dropped: Insufficient text length.');
    return res.json({ score: 0, riskLevel: 'Safe', reason: 'Insufficient content.' });
  }

  const { source, senderAddress, url } = req.body;
  const text = incomingText;
  const userId = extractUserIdFromToken(req);

  if (!text) {
    return res.status(400).json({ error: 'Text content is required' });
  }

  const checkText = text || '';
  const checkUrl = url || '';

  // Trusted platform domain/content check (REMOVED: User wants full AI verbosity for all platforms)
  /*
  if (
    checkUrl.includes('whatsapp.com') || checkUrl.includes('instagram.com/direct') ||
    checkText.includes('whatsapp.com') || checkText.includes('instagram.com/direct')
  ) {
    return res.json({ score: 0, riskLevel: 'Safe', reason: 'Trusted platform domain.' });
  }
  */

  function stripUTM(txt) {
    try {
      const urlObj = new URL(txt);
      const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
      paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
      return urlObj.toString();
    } catch {
      return txt;
    }
  }

  let analysisContent = stripUTM(text);

  // Consolidated Logging Helper
  const logBeautifulScan = ({ source, content, score, tier, verdict, reason }) => {
    console.log('\n=============================================');
    console.log('[PhishNinja Text] 📩 Incoming Scan Request');
    console.log(`[PhishNinja Text] Source: ${source || 'Unknown'}`);
    console.log(`[PhishNinja Text] Content Preview: ${content ? content.substring(0, 100).replace(/\n/g, ' ') : 'NO TEXT'}...`);
    console.log(`[PhishNinja Text] 🧮 Vector Similarity Score: ${score.toFixed(4)}`);
    console.log(`[PhishNinja Text] ${tier}`);
    console.log(`[PhishNinja Text] 🧠 Groq Verdict: ${verdict} | Reason: ${reason}`);
    console.log('=============================================\n');
  };

  try {
    // 0. Trusted Sender Bypass
    if (senderAddress) {
      const s = senderAddress.toLowerCase();
      if (s === 'no-reply@mail.instagram.com' || s.endsWith('@google.com')) {
        const result = {
          score: 0,
          riskLevel: 'Safe',
          reason: 'Trusted sender domain bypass.'
        };
        logBeautifulScan({
          source: req.body.source,
          content: analysisContent,
          score: 0,
          tier: '✅ KILL-SWITCH: Trusted sender domain bypass.',
          verdict: 'Safe',
          reason: result.reason
        });
        return res.json(result);
      }
    }

    // 1. Get Embedding (local 384-dim)
    const embedding = await getEmbedding(analysisContent);

    // 2. Perform Vector Search (RAG)
    const vectorSearchQuery = `
      SELECT content, (1 - (embedding_local <=> $1::vector)) as similarity
      FROM phishninja_vectors
      WHERE threat_type = 'TEXT'
      ORDER BY similarity DESC
      LIMIT 1;
    `;
    
    const { rows } = await query(vectorSearchQuery, [JSON.stringify(embedding)]);
    const score = rows.length > 0 ? rows[0].similarity : 0;

    if (score >= 0.85) {
      const reason = 'Matches a known threat in the database with high confidence.';
      await logDetection(userId, 'TEXT', 'danger', 'RAG (Vector Store)', reason, analysisContent);

      logBeautifulScan({
        source: req.body.source,
        content: analysisContent,
        score: score,
        tier: '🚨 TIER 1 MATCH: Known threat detected in Vector DB.',
        verdict: 'Danger',
        reason: reason
      });
      return res.json({
        score,
        riskLevel: 'Danger',
        reason: reason
      });
    }

    // Tier 3 (Score < 0.72)
    if (score < 0.72) {
      const suspiciousKeywords = [
        'account suspended', 'immediate action required', 'unauthorized login attempt',
        'verify your identity now', 'click here to secure', 'wallet compromised',
        'seed phrase', 'kyc update mandatory', 'unusual activity detected',
        'confirm your billing details', 'validate your account', 'claim your prize',
        'security alert warning'
      ];
      const hasSuspiciousKeyword = suspiciousKeywords.some(keyword => analysisContent.toLowerCase().includes(keyword.toLowerCase()));

      if (!hasSuspiciousKeyword) {
        const reason = 'Score below 0.72 and no suspicious keywords found. Marking as SAFE.';
        await logDetection(userId, 'TEXT', 'safe', 'RAG (Vector Store)', reason, analysisContent);

        logBeautifulScan({
          source: req.body.source,
          content: analysisContent,
          score: score,
          tier: '✅ TIER 3 MATCH: Low similarity, marked as safe.',
          verdict: 'Safe',
          reason: reason
        });
        return res.json({
          score,
          riskLevel: 'Safe',
          reason: reason
        });
      }
    }

    // 3. Groq Analysis with Context
    const contextText = rows.length > 0 ? 
      `Known Threat Context: A somewhat similar item was previously flagged. Similar content snippet: "${rows[0].content.substring(0, 200)}"` : 
      "No similar threats found in database.";

    const systemPrompt = `You are an elite phishing detection engine. Ignore marketing UTM tags, technical session IDs, and application loading statuses. Flag a site ONLY if you see deceptive intent, brand impersonation, or credential harvesting patterns.
Respond ONLY with a valid JSON object.

JSON format:
{
  "score": 0.95,
  "riskLevel": "Danger" | "Risk" | "Safe",
  "reason": "Detailed explanation of why this is dangerous, mentions specific patterns if possible."
}

Rules:
- "Danger": Confirmed phishing, malware links, or malicious social engineering. (Score > 0.8)
- "Risk": Suspicious but not definitive, or low-quality spam. (Score 0.5 - 0.8)
- "Safe": Legitimate content. (Score < 0.5)

${contextText}`;

    const userPrompt = `Analyze the following text content from ${source || 'Unknown Source'}:\n"""\n${analysisContent.substring(0, 2000)}\n"""`;

    let data;
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

      const aiText = chatCompletion.choices[0]?.message?.content;
      if (!aiText) throw new Error('AI failed to return a response');

      data = safeParseLLMJSON(aiText);
      if (!data || !data.riskLevel) throw new Error('Failed to parse AI response into JSON');
    } catch (apiError) {
      console.warn('[RAG Backend] Groq API error:', apiError.message);
      const riskRegex = /(login|verify|password|urgent|account|suspended|blocked|update|bank|secure)/i;
      if (riskRegex.test(analysisContent)) {
        data = { score: 0.6, riskLevel: 'Risk', reason: 'AI service unavailable. Content matches suspicious keywords.' };
      } else {
        data = { score: 0.1, riskLevel: 'Safe', reason: 'AI service unavailable. Content appears benign.' };
      }
    }

    // 4. Log to Detections Page (Database)
      await logDetection(userId, 'TEXT', data.riskLevel.toLowerCase(), 'RAG Analysis', data.reason, analysisContent);

    
    logBeautifulScan({
      source: req.body.source,
      content: analysisContent,
      score: score,
      tier: score < 0.72 ? '⚠️ KEYWORD OVERRIDE: Low score but suspicious keywords found.' : '⚠️ TIER 2 MATCH: Suspicious pattern. Sent to Groq AI.',
      verdict: data.riskLevel,
      reason: data.reason
    });

    return res.json(data);

  } catch (error) {
    console.error('[RAG Backend] Error:', error.message);
    const result = { score: 0, riskLevel: 'Safe', reason: 'PhishNinja RAG analysis failed locally. Defaulting to safe.' };
    logBeautifulScan({
      source: req.body.source,
      content: analysisContent,
      score: 0,
      tier: '❌ ERROR: System failure.',
      verdict: 'Safe',
      reason: result.reason
    });
    return res.status(500).json(result);
  }
}

