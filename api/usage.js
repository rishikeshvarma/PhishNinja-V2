import { query } from './_utils/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Count all records in detections_page for a global usage metric
    // Alternatively, filter by user if specific user usage is needed
    const { rows } = await query('SELECT COUNT(*) as count FROM detections_page');
    const usedCount = parseInt(rows[0].count, 10) || 0;

    // Standard daily limit or overall limit
    const dailyLimit = 14400; 

    return res.status(200).json({
      used: usedCount,
      limit: dailyLimit,
      percentage: Math.min(((usedCount / dailyLimit) * 100).toFixed(2), 100)
    });
  } catch (error) {
    console.error('Usage API Error:', error);
    return res.status(500).json({ error: 'Internal server error', used: 0, limit: 14400 });
  }
}
