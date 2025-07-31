import sha1 from 'sha1';
import dbClient from '../utils/db';

/**
 * Controller for handling user-related endpoints.
 */
class UsersController {
  /**
   * Handles the creation of a new user.
   * It validates the request body, checks if the user already exists,
   * hashes the password, and saves the new user to the database.
   * @param {object} req The Express request object.
   * @param {object} res The Express response object.
   */
  static async postNew(req, res) {
    const { email, password } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    try {
      const db = dbClient.client.db(process.env.DB_DATABASE || 'files_manager');
      const usersCollection = db.collection('users');

      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Already exist' });
      }

      const hashedPassword = sha1(password);
      const result = await usersCollection.insertOne({
        email,
        password: hashedPassword,
      });

      return res.status(201).json({ id: result.insertedId, email });
    } catch (error) {
      console.error('Error creating new user:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default UsersController;
