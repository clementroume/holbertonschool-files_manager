import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

/**
 * Controller for handling authentication-related endpoints.
 */
class AuthController {
  /**
   * Handles user sign-in.
   * It validates credentials from the Authorization header, generates a token,
   * and stores it in Redis.
   * @param {object} req The Express request object.
   * @param {object} res The Express response object.
   */
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const credentials = Buffer.from(authHeader.substring(6), 'base64').toString(
      'utf-8',
    );
    const [email, password] = credentials.split(':');

    if (!email || !password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const hashedPassword = sha1(password);
      const db = dbClient.client.db(process.env.DB_DATABASE || 'files_manager');
      const user = await db
        .collection('users')
        .findOne({ email, password: hashedPassword });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const token = uuidv4();
      const key = `auth_${token}`;
      await redisClient.set(key, user._id.toString(), 86400); // 86400 seconds = 24 hours

      return res.status(200).json({ token });
    } catch (error) {
      console.error('Error during connect:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Handles user sign-out.
   * It validates the token from the X-Token header and deletes it from Redis.
   * @param {object} req The Express request object.
   * @param {object} res The Express response object.
   */
  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const key = `auth_${token}`;
      const userId = await redisClient.get(key);

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await redisClient.del(key);
      return res.status(204).send();
    } catch (error) {
      console.error('Error during disconnect:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default AuthController;
