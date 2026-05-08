import { query } from '../_utils/db.js';
import { extractUserIdFromToken } from '../_utils/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = extractUserIdFromToken(req);
  const { name, email, profile_pic } = req.body;

  if (!id) {
    return res.status(401).json({ error: 'Unauthorized: User ID (sub) is required' });
  }

  try {
    // Upsert query as per directive
    const upsertQuery = `
      INSERT INTO users (id, name, email, profile_pic) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT (id) DO UPDATE 
      SET name = EXCLUDED.name, profile_pic = EXCLUDED.profile_pic
      RETURNING *;
    `;

    const result = await query(upsertQuery, [id, name, email, profile_pic]);

    return res.status(200).json({
      success: true,
      message: 'User synced successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Database Sync Error:', error);
    return res.status(500).json({
      error: 'Failed to sync user with database',
      message: error.message
    });
  }
}
