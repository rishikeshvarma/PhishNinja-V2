import { jwtDecode } from 'jwt-decode';
import { query } from './db.js';

/**
 * Extracts the user ID (sub) and performs a background sync/creation if needed.
 * This is the "Gatekeeper" that ensures the DB is always consistent with the token.
 * @param {Object} req - The request object.
 * @returns {Promise<string|null>} The user ID or null if not found/invalid.
 */
export async function syncUserIdentity(req) {
  const auth = req.headers?.authorization;
  
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.substring(7);
    if (!token || token === 'undefined' || token === 'null') {
      console.warn('[Identity] Empty or null token received');
      return null;
    }
    
    console.log('[Identity] Token Received');
    
    try {
      const decoded = jwtDecode(token);
      const id = decoded.sub;
      const email = decoded.email;
      const name = decoded.name;
      const profile_pic = decoded.picture;

      if (!id) {
        console.error('[Identity] Token decoding failed: No "sub" claim found');
        return null;
      }

      console.log(`[Identity] User Identified: ${email || id}`);

      // 1. Ensure User exists (UPSERT)
      const userUpsertQuery = `
        INSERT INTO users (id, name, email, profile_pic) 
        VALUES ($1, $2, $3, $4) 
        ON CONFLICT (id) DO UPDATE 
        SET name = COALESCE(EXCLUDED.name, users.name), 
            profile_pic = COALESCE(EXCLUDED.profile_pic, users.profile_pic)
        RETURNING *;
      `;
      await query(userUpsertQuery, [id, name, email, profile_pic]);

      // 2. Ensure User Settings exist (UPSERT with defaults)
      const defaultSettings = {
        aggressiveness_level: 'High Alert (Vigilant)',
        auto_sandbox: true,
        threat_intel_feed: true,
        daily_api_quota: 2000
      };

      const settingsUpsertQuery = `
        INSERT INTO user_settings (user_id, settings, allowlist, bin)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) DO NOTHING;
      `;
      await query(settingsUpsertQuery, [id, JSON.stringify(defaultSettings), [], []]);

      console.log(`[Identity] Database Entry Created/Found for ${id}`);
      return id;
    } catch (error) {
      console.error('[Identity] JWT Decoding/Sync Error:', error.message);
      return null;
    }
  }

  // Fallback to userId in body if provided (legacy/direct), else null
  const bodyId = req.body?.userId || null;
  if (bodyId) console.log(`[Identity] Using fallback ID from body: ${bodyId}`);
  return bodyId;
}

/**
 * LEGACY: Only extracts ID without performing sync.
 * Use syncUserIdentity(req) instead for primary flows.
 */
export function extractUserIdFromToken(req) {
  const auth = req.headers?.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const token = auth.substring(7);
      const decoded = jwtDecode(token);
      return decoded.sub || null;
    } catch (e) {
      return null;
    }
  }
  return req.body?.userId || null;
}
