import redisClient from './redis';

/**
 * Utility function to authenticate a user based on the x-token header.
 * If authentication fails, it sends an error response and returns null.
 * @param {object} req The Express request object.
 * @param {object} res The Express response object.
 * @returns {Promise<string|null>} The user's ID if authenticated, otherwise null.
 */
async function getAuthenticatedUserId(req, res) {
  const token = req.headers['x-token'];
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
  }

  return userId;
}

export default getAuthenticatedUserId;
