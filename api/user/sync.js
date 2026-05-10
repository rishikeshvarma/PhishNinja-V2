import { syncUserIdentity } from '../_utils/auth.js';
import { query } from '../_utils/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // syncUserIdentity now handles the extraction, UPSERT of user, and UPSERT of settings.
    const userId = await syncUserIdentity(req);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Failed to identify user' });
    }

    // Fetch the final user record to return in the response
    const result = await query('SELECT * FROM users WHERE id = $1', [userId]);

    return res.status(200).json({
      success: true,
      message: 'User synced successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('[API Sync] Execution Error:', error);
    return res.status(500).json({
      error: 'Failed to sync user',
      message: error.message
    });
  }
}
