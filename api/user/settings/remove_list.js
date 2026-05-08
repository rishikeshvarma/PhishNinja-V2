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
    // Atomic array_remove to ensure no race conditions and efficient updates
    const updateQuery = `
      UPDATE user_settings 
      SET ${listType} = array_remove(${listType}, $1),
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
      RETURNING *;
    `;

    const result = await query(updateQuery, [url, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User settings not found' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Remove List Error:', error);
    return res.status(500).json({ error: 'Internal server error during list removal' });
  }
}
