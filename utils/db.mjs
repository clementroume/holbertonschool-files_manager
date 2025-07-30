import mongodb from 'mongodb';

/**
 * Represents a client for interacting with a MongoDB server.
 */
class DBClient {
  /**
   * Creates a new DBClient instance.
   * It reads environment variables to configure the connection
   * and initiates the connection process.
   */
  constructor() {
    // Read environment variables with default values
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    // Construct the MongoDb connection URL
    const url = `mongodb://${host}:${port}`;

    // Create a new MongoClient
    this.client = new mongodb.MongoClient(url, { useUnifiedTopology: true });

    // Initiate the connection. The driver will queue operations until it's complete.
    this.client.connect();
  }

  /**
   * Checks if the connection to the MongoDB server is alive.
   * @returns {boolean} True if the client is connected, otherwise false.
   */
  isAlive() {
    return this.client.isConnected();
  }

  /**
   * Retrieves the number of documents in the 'users' collection.
   * @returns {Promise<number>} The total number of users.
   */
  async nbUsers() {
    const db = this.client.db(this.database);
    return db.collection('users').countDocuments();
  }

  /**
   * Retrieves the number of documents in the 'files' collection.
   * @returns {Promise<number>} The total number of files.
   */
  async nbFiles() {
    const db = this.client.db(this.database);
    return db.collection('files').countDocuments();
  }
}

// Create and export a single instance of the client
const dbClient = new DBClient();
export default dbClient;
