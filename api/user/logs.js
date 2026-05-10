import { query } from '../_utils/db.js';
import { extractUserIdFromToken } from '../_utils/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // --- API Telemetry ---
  console.log('[API Logs] GET request received');
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('Validation Error: Missing or invalid Authorization header');
    return res.status(401).json({ error: 'Unauthorized: Missing Auth Header' });
  }

  let userId;
  try {
    userId = extractUserIdFromToken(req);
    if (!userId) {
      console.error('Validation Error: Could not extract sub claim from JWT');
      return res.status(401).json({ error: 'Unauthorized: Invalid Token' });
    }
  } catch (err) {
    console.error('Validation Error: JWT Parsing Failed:', err.message);
    return res.status(401).json({ error: 'Unauthorized: JWT Decode Failure' });
  }

  try {
    // 1. Extract page and limit from query (defaults: page 1, limit 50)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    console.log(`Fetching detections for userId: ${userId} (Page: ${page}, Limit: ${limit})`);

    // 2. Run COUNT(*) to get total records
    const countRes = await query(
      'SELECT COUNT(*) FROM detections_page WHERE user_id = $1',
      [userId]
    );
    const totalRecords = parseInt(countRes.rows[0].count);

    // 3. Update the main SELECT query with LIMIT and OFFSET
    const { rows } = await query(
      'SELECT * FROM detections_page WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );

    const totalPages = Math.ceil(totalRecords / limit);

    // 4. Return paginated JSON object
    return res.status(200).json({
      data: rows,
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages,
        limit
      }
    });
  } catch (error) {
    console.error('DB Query Failed (Logs):', error);
    return res.status(500).json({ 
      error: 'DB_LOGS_FETCH_FAILED',
      message: error.message 
    });
  }
}
