import { query } from './db.js';
import { getEmbedding, classifyText } from './ai.js';
import axios from 'axios';

/**
 * @deprecated Use /api/scan/url.js for unified scanning logic.
 * Legacy scanUrl kept here for backwards compatibility if needed by old utilities,
 * but should not be used for new development.
 */
export async function scanUrl(url, userId, aggressiveness = 'Standard') {
  console.warn('[DEPRECATED] scanUrl in _utils/scanner.js was called. Redirecting to url.js logic is advised.');
  // ... existing logic but marked as legacy
  return { status: 'error', reason: 'Deprecated utility function.' };
}

export async function scanText(text, userId, aggressiveness = 'Standard') {
  const logBeautifulScan = ({ content, score, tier, verdict, reason }) => {
    console.log('\n=============================================');
    console.log('[PhishNinja Text] 📩 Incoming Content Scan');
    console.log(`[PhishNinja Text] Content Preview: ${content ? content.substring(0, 100).replace(/\n/g, ' ') : 'NO TEXT'}...`);
    console.log(`[PhishNinja Text] Aggressiveness: ${aggressiveness}`);
    console.log(`[PhishNinja Text] 🧮 Vector Similarity Score: ${score ? score.toFixed(4) : 'N/A'}`);
    console.log(`[PhishNinja Text] ${tier}`);
    console.log(`[PhishNinja Text] 🧠 Verdict: ${verdict} | Reason: ${reason}`);
    console.log('=============================================\n');
  };

  const embedding = await getEmbedding(text);
  const vectorSearchQuery = `
    SELECT content, status, (1 - (embedding_local <=> $1::vector)) as similarity
    FROM phishninja_vectors
    WHERE threat_type = 'TEXT'
    ORDER BY similarity DESC
    LIMIT 1;
  `;
  const { rows } = await query(vectorSearchQuery, [JSON.stringify(embedding)]);

  let context = null;
  let vectorScore = 0;
  if (rows.length > 0) {
    vectorScore = rows[0].similarity || 0;
    
    if (vectorScore >= 0.85) {
      const match = rows[0];
      const reason = `Known malicious message detected (Similarity: ${(vectorScore * 100).toFixed(1)}%).`;
      await logDetection(userId, 'TEXT', 'danger', 'Vector Store', reason, text);
      logBeautifulScan({
        content: text,
        score: vectorScore,
        tier: '🚨 TIER 1 MATCH: Known threat detected in Vector DB.',
        verdict: 'Danger',
        reason
      });
      return { status: 'danger', source: 'local_vector_store', ai_reason: reason };
    }
    
    if (vectorScore > 0.4) {
      context = `SIMILAR PREVIOUS THREAT (Score: ${vectorScore.toFixed(2)}): ${rows[0].content}`;
    }
  }

  // Pass context to LLM for enhanced analysis
  const classification = await classifyText(text, aggressiveness, null, context);
  
  await logDetection(userId, 'TEXT', classification.status, 'AI Classifier', classification.ai_reason, text);

  logBeautifulScan({
    content: text,
    score: vectorScore,
    tier: vectorScore >= 0.72 ? '⚠️ TIER 2 MATCH: Suspicious pattern. Sent to AI.' : '✅ TIER 3 MATCH: General analysis.',
    verdict: classification.status,
    reason: classification.ai_reason
  });

  if (classification.status !== 'safe') {
    try {
      await query('INSERT INTO phishninja_vectors (content, threat_type, embedding_local, status) VALUES ($1, $2, $3, $4)', [text.substring(0, 500), 'TEXT', JSON.stringify(embedding), classification.status]);
    } catch (dbErr) {
      console.warn('Could not store vector:', dbErr.message);
    }
  }

  return { ...classification, source: 'ai_classifier' };
}


export async function logDetection(userId, type, status, source, ai_reason, content = null) {
  try {
    // If userId is missing, it will be inserted as NULL (allowed by the schema)
    await query(
      'INSERT INTO detections_page (user_id, type, status, source, ai_reason, content) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId || 'guest_user', type, status, source, ai_reason, content]
    );
  } catch (err) {
    console.error('Logging Error:', err);
  }
}


