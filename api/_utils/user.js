import { query } from './db.js';
import { jwtDecode } from 'jwt-decode';

/**
 * Ensures a user exists in the 'users' table and has default 'user_settings'.
 * This is called on every critical API hit to prevent race conditions for new accounts.
 * @param {string} userId The extracted user identifier (sub)
 * @param {string} token The Bearer token (optional, for profile info)
 */
export async function ensureUserOnboarded(userId, token = null) {
  if (!userId || userId === 'guest_user') return;

  try {
    // 1. Ensure user exists in 'users'
    let name = 'PhishNinja User';
    let email = '';
    let picture = '';

    if (token) {
      try {
        const decoded = jwtDecode(token);
        name = decoded.name || name;
        email = decoded.email || email;
        picture = decoded.picture || picture;
      } catch (e) {
        console.warn('[UserUtils] Failed to decode token for profile info:', e.message);
      }
    }

    await query(`
      INSERT INTO users (id, name, email, profile_pic)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET 
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        profile_pic = EXCLUDED.profile_pic
    `, [userId, name, email, picture]);

    // 2. Ensure default settings exist
    const defaultSettings = {
      aggressiveness_level: 'High Alert (Vigilant)',
      auto_sandbox: true,
      threat_intel_feed: true,
      daily_api_quota: 2000
    };

    await query(`
      INSERT INTO user_settings (user_id, settings, allowlist, bin)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) DO NOTHING
    `, [userId, JSON.stringify(defaultSettings), [], []]);

  } catch (error) {
    console.error('[UserUtils] Critical Error in ensureUserOnboarded:', error);
    throw error; // Re-throw to let the handler decide
  }
}
