import { extractUserIdFromToken } from '../_utils/auth.js';
import { ensureUserOnboarded } from '../_utils/user.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = extractUserIdFromToken(req);
  const authHeader = req.headers.authorization;

  if (!id || id === 'guest_user') {
    return res.status(401).json({ error: 'Unauthorized: Valid User Token required for sync' });
  }

  try {
    const token = authHeader.substring(7);
    await ensureUserOnboarded(id, token);

    return res.status(200).json({
      success: true,
      message: 'User synced and onboarded successfully'
    });
  } catch (error) {
    console.error('Database Sync Error:', error);
    return res.status(500).json({
      error: 'Failed to sync user with database',
      message: error.message
    });
  }
}
