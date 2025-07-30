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

    // Internal state to track connection status
    this._connected = false;
    this.db = null;

    // Start the connection process and update state upon completion
    this.client
      .connect()
      .then(() => {
        this.db = this.client.db(database);
        this._connected = true;
      })
      .catch((err) => {
        console.error('MongoDB connection error:', err.message);
        this._connected = false;
      });
  }

  /**
   * Checks if the connection to the MongoDB server is alive.
   * @returns {boolean} True if the client is connected, otherwise false.
   */
  isAlive() {
    return this._connected;
  }

  /**
   * Retrieves the number of documents in the 'users' collection.
   * @returns {Promise<number>} The total number of users.
   */
  async nbUsers() {
    if (!this.isAlive()) {
      return 0;
    }
    try {
      const db = this.client.db(this.dbName);
      const usersCollection = db.collection('users');
      return await usersCollection.countDocuments();
    } catch (err) {
      console.error('Error counting users:', err);
      return 0;
    }
  }

  /**
   * Retrieves the number of documents in the 'files' collection.
   * @returns {Promise<number>} The total number of files.
   */
  async nbFiles() {
    if (!this.isAlive()) {
      return 0;
    }
    try {
      const db = this.client.db(this.dbName);
      const filesCollection = db.collection('files');
      return await filesCollection.countDocuments();
    } catch (err) {
      console.error('Error counting files:', err);
      return 0;
    }
  }
}

const dbClient = new DBClient();
export default dbClient;
