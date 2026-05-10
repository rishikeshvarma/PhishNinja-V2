import { query } from '../../_utils/db.js';
import { syncUserIdentity } from '../../_utils/auth.js';

export default async function handler(req, res) {
  // --- API Telemetry ---
  console.log(`[API Settings] ${req.method} request received for user identification.`);

  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('Validation Error: Missing or invalid Authorization header');
    return res.status(401).json({ error: 'Unauthorized: Missing Auth Header' });
  }

  let userId;
  try {
    userId = await syncUserIdentity(req);
    if (!userId) {
      console.error('Validation Error: No userId found in Token');
      return res.status(401).json({ error: 'Unauthorized: userId is required' });
    }
  } catch (err) {
    console.error('Validation Error: Identity sync failed:', err.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid token or identity sync failed' });
  }

  // --- GET Handler ---
  if (req.method === 'GET') {
    try {
      console.log(`Fetching settings for user: ${userId}`);
      const result = await query(`
        SELECT us.*, u.profile_pic 
        FROM user_settings us
        LEFT JOIN users u ON us.user_id = u.id
        WHERE us.user_id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        console.log(`No settings found for ${userId}, returning default set...`);
        return res.status(200).json({
          user_id: userId,
          bin: [],
          allowlist: [],
          settings: {
            aggressiveness_level: 'High Alert (Vigilant)',
            auto_sandbox: true,
            threat_intel_feed: true,
            daily_api_quota: 2000
          }
        });
      }

      return res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error('Database Error (GET settings):', error);
      return res.status(500).json({ 
        error: 'DB_SETTINGS_FETCH_FAILED',
        message: error.message 
      });
    }
  }

  // --- POST/PUT Handler (Catch-up Push / Update) ---
  if (req.method === 'POST' || req.method === 'PUT') {
    const { settings, allowlist, bin, listType, url } = req.body || {};

    try {
      // 1. Atomic update if listType/url provided
      if (listType && url) {
        if (listType !== 'bin' && listType !== 'allowlist') {
          console.error('Validation Error: Invalid listType:', listType);
          return res.status(400).json({ error: 'listType must be "bin" or "allowlist"' });
        }

        const atomicQuery = `
          UPDATE user_settings 
          SET ${listType} = array_append(array_remove(${listType}, $1), $1),
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2
          RETURNING *;
        `;
        const result = await query(atomicQuery, [url, userId]);
        if (result.rows.length > 0) return res.status(200).json(result.rows[0]);

        // Fallback: Create if doesn't exist
        const insertQuery = `
          INSERT INTO user_settings (user_id, settings, allowlist, bin)
          VALUES ($1, $2, $3, $4)
          RETURNING *;
        `;
        const al = listType === 'allowlist' ? [url] : [];
        const bn = listType === 'bin' ? [url] : [];
        const newSettings = await query(insertQuery, [userId, '{}', al, bn]);
        return res.status(200).json(newSettings.rows[0]);
      }

      // 2. Full Sync Update
      let updates = [];
      const params = [userId];

      if (settings) {
        params.push(typeof settings === 'string' ? settings : JSON.stringify(settings));
        updates.push(`settings = $${params.length}`);
      }
      if (allowlist) {
        if (!Array.isArray(allowlist)) {
          console.error('Validation Error: allowlist must be an array');
          return res.status(400).json({ error: 'allowlist must be an array' });
        }
        params.push(allowlist);
        updates.push(`allowlist = $${params.length}`);
      }
      if (bin) {
        if (!Array.isArray(bin)) {
          console.error('Validation Error: bin must be an array');
          return res.status(400).json({ error: 'bin must be an array' });
        }
        params.push(bin);
        updates.push(`bin = $${params.length}`);
      }

      if (updates.length === 0) {
        console.error('Validation Error: No fields provided for update');
        return res.status(400).json({ error: 'Nothing to update' });
      }

      const updateQuery = `
        UPDATE user_settings 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = $1 
        RETURNING *;
      `;

      const result = await query(updateQuery, params);
      return res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error('Database Error (POST settings):', error);
      return res.status(500).json({ 
        error: 'DB_SETTINGS_UPDATE_FAILED',
        message: error.message 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
