import { query } from '../_utils/db.js';
import { extractUserIdFromToken } from '../_utils/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('[API Stats] GET request received');
  const userId = extractUserIdFromToken(req);

  if (!userId) {
    console.error('Validation Error: Missing or invalid token in Stats request');
    return res.status(401).json({ error: 'Unauthorized: userId is required' });
  }

  try {
    const totalScannedQuery = 'SELECT COUNT(*) FROM detections_page WHERE user_id = $1';
    const threatsBlockedQuery = "SELECT COUNT(*) FROM detections_page WHERE user_id = $1 AND status != 'safe'";
    const cleanItemsQuery = "SELECT COUNT(*) FROM detections_page WHERE user_id = $1 AND status = 'safe'";

    const [totalRes, threatsRes, cleanRes] = await Promise.all([
      query(totalScannedQuery, [userId]),
      query(threatsBlockedQuery, [userId]),
      query(cleanItemsQuery, [userId])
    ]);

    return res.status(200).json({
      totalScanned: parseInt(totalRes.rows[0].count),
      threatsBlocked: parseInt(threatsRes.rows[0].count),
      cleanItems: parseInt(cleanRes.rows[0].count),
      accuracy: '99.9%', // Mock for now or calculate
    });
  } catch (error) {
    console.error('Fetch Stats Error:', error);
    return res.status(500).json({ 
      error: 'DB_STATS_FETCH_FAILED',
      message: error.message 
    });
  }
}
