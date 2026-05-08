import { scanText } from '../_utils/scanner.js';
import { extractUserIdFromToken } from '../_utils/auth.js';
import { query } from '../_utils/db.js';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, source } = req.body;

  // Increment global usage counter
  if (global.dailyUsageCount !== undefined) {
    global.dailyUsageCount++;
  }

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  // Extract userId from Authorization header (JWT sub)
  const effectiveUserId = extractUserIdFromToken(req);

  // Fetch user settings to get Aggressiveness Level
  let aggressiveness = 'Standard';
  if (effectiveUserId) {
    try {
      const { rows } = await query('SELECT settings FROM user_settings WHERE user_id = $1', [effectiveUserId]);
      if (rows.length > 0 && rows[0].settings?.aggressiveness_level) {
        const level = rows[0].settings.aggressiveness_level;
        if (level.includes('High Alert')) aggressiveness = 'High Alert';
        else if (level.includes('Zero Trust')) aggressiveness = 'Zero Trust';
        else aggressiveness = 'Standard';
      }
    } catch (err) {
      console.error('Error fetching user settings:', err);
    }
  }

  try {
    const result = await scanText(text, effectiveUserId, aggressiveness);
    return res.status(200).json({
      ...result,
      scanned_source: source || 'api',
      applied_aggressiveness: aggressiveness
    });
  } catch (error) {
    console.error('Text Scan Error:', error);
    return res.status(500).json({
      error: 'Internal server error during scan',
      status: 'safe',
      ai_reason: 'Scan service temporarily unavailable. Proceeding with caution.'
    });
  }
}
