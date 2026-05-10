import { jwtDecode } from 'jwt-decode';

/**
 * Extracts the user ID (sub) from the Authorization header or body.
 * @param {Object} req - The request object.
 * @returns {string|null} The user ID or null if not found/invalid.
 */
export function extractUserIdFromToken(req) {
  const auth = req.headers?.authorization;
  
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.substring(7);
    if (!token || token === 'undefined' || token === 'null' || token === '') {
      return 'guest_user';
    }
    
    try {
      // Note: In a production environment with google-auth-library, 
      // we would use verifyIdToken() here to check the signature.
      const decoded = jwtDecode(token);
      return decoded.sub || 'guest_user';
    } catch (error) {
      console.error('JWT Decoding Error in Backend:', error);
      return 'guest_user';
    }
  }

  // Fallback to userId in body if provided (legacy/direct), else guest_user
  return req.body?.userId || 'guest_user';
}
