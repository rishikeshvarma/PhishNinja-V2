import { query } from '../_utils/db.js';
import { extractUserIdFromToken } from '../_utils/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = extractUserIdFromToken(req);
  const { name, email, picture } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: userId is required' });
  }

  try {
    // Upsert user: Create if doesn't exist, Update if it does
    const upsertQuery = `
      INSERT INTO users (id, name, email, profile_pic)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE 
      SET 
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        profile_pic = EXCLUDED.profile_pic
      RETURNING *
    `;

    const result = await query(upsertQuery, [userId, name || 'PhishNinja User', email || '', picture || '']);

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Upsert User Error:', error);
    if (error.code === '23505') { // Unique violation for email
      return res.status(400).json({ error: 'Email already in use by another account' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

