import redisClient from '../utils/redis';
import dbClient from '../utils/db';

/**
 * Controller for application-level endpoints.
 */
class AppController {
  /**
   * Handles the GET /status endpoint.
   * Returns the status of Redis and the database connection.
   * @param {object} req The request object.
   * @param {object} res The response object.
   */
  static getStatus(req, res) {
    const redisAlive = redisClient.isAlive();
    const dbAlive = dbClient.isAlive();
    res.status(200).json({ redis: redisAlive, db: dbAlive });
  }

  /**
   * Handles the GET /stats endpoint.
   * Returns the number of users and files in the database.
   * @param {object} req The request object.
   * @param {object} res The response object.
   */
  static async getStats(req, res) {
    try {
      const userCount = await dbClient.nbUsers();
      const fileCount = await dbClient.nbFiles();
      res.status(200).json({ users: userCount, files: fileCount });
    } catch {
      console.error('Could not get stats:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default AppController;
