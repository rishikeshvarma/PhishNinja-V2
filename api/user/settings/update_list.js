import { query } from '../../_utils/db.js';
import { extractUserIdFromToken } from '../../_utils/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = extractUserIdFromToken(req) || req.body.userId;
  const { listType, url } = req.body;

  if (!userId || !listType || !url) {
    return res.status(400).json({ error: 'userId (or Auth token), listType (bin|allowlist), and url are required' });
  }

  if (listType !== 'bin' && listType !== 'allowlist') {
    return res.status(400).json({ error: 'listType must be either "bin" or "allowlist"' });
  }

  try {
    // Atomic array_append to ensure no race conditions and efficient updates
    const updateQuery = `
      UPDATE user_settings 
      SET ${listType} = array_append(array_remove(${listType}, $1), $1),
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
      RETURNING *;
    `;
    
    const result = await query(updateQuery, [url, userId]);
    
    if (result.rows.length === 0) {
      // If user settings don't exist yet, create them with the initial list item
      const defaultSettings = {
        aggressiveness_level: 'High Alert (Vigilant)',
        auto_sandbox: true,
        threat_intel_feed: true,
        daily_api_quota: 2000
      };
      const insertQuery = `
        INSERT INTO user_settings (user_id, settings, allowlist, bin)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const allowlistVal = listType === 'allowlist' ? [url] : [];
      const binVal = listType === 'bin' ? [url] : [];
      const newSettings = await query(insertQuery, [userId, JSON.stringify(defaultSettings), allowlistVal, binVal]);
      return res.status(200).json(newSettings.rows[0]);
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Update List Error:', error);
    return res.status(500).json({ error: 'Internal server error during list update' });
  }
}
