import mongodb from 'mongodb';

/**
 * Represents a client for interacting with a MongoDB server.
 */
class DBClient {
  /**
   * Creates a new DBClient instance.
   * It reads environment variables to configure the connection
   * and initiates the connection process in the background.
   */
  constructor() {
    // Read environment variables with default values
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    this.database = process.env.DB_DATABASE || 'files_manager';

    // Construct the MongoDB connection URL
    const url = `mongodb://${host}:${port}`;

    // Create a new MongoClient with the recommended option
    this.client = new mongodb.MongoClient(url, { useUnifiedTopology: true });

    // Initiate the connection and store the promise.
    // This allows other methods to wait for the connection to complete.
    this.connectionPromise = this.client.connect().catch((err) => {
      // Catch initial connection errors to prevent unhandled promise rejections
      console.error('Initial MongoDB connection error:', err.message);
    });
  }

  /**
   * Checks if the connection to the MongoDB server is alive.
   * @returns {boolean} True if the client is connected, otherwise false.
   */
  isAlive() {
    // isConnected is deprecated but required for the project's tests with mongodb v3
    return this.client.isConnected();
  }

  /**
   * Retrieves the number of documents in the 'users' collection.
   * @returns {Promise<number>} The total number of users.
   */
  async nbUsers() {
    try {
      await this.connectionPromise; // Ensure connection is complete before proceeding
      const db = this.client.db(this.database);
      return await db.collection('users').countDocuments();
    } catch (err) {
      console.error('Error in nbUsers:', err.message);
      return 0;
    }
  }

  /**
   * Retrieves the number of documents in the 'files' collection.
   * @returns {Promise<number>} The total number of files.
   */
  async nbFiles() {
    try {
      await this.connectionPromise; // Ensure connection is complete before proceeding
      const db = this.client.db(this.database);
      return await db.collection('files').countDocuments();
    } catch (err) {
      console.error('Error in nbFiles:', err.message);
      return 0;
    }
  }
}

// Create and export a single instance of the client
const dbClient = new DBClient();
export default dbClient;
