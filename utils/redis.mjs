import { createClient } from 'redis';
import { promisify } from 'util';

/**
 * Represents a client for interacting with a Redis server.
 */
class RedisClient {
  /**
   * Creates a new RedisClient instance.
   * It initializes the connection and sets up an error listener.
   */
  constructor() {
    this.client = createClient();

    this.client.on('error', (err) => {
      console.log(`Redis client not connected to the server: ${err.message}`);
    });

    // Promisify the methods we need to use them with async/await
    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.setex).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
  }

  /**
   * Checks if the connection to the Redis server is alive.
   * @returns {boolean} True if the client is connected and ready, otherwise false.
   */
  isAlive() {
    return this.client.connected;
  }

  /**
   * Retrieves the value stored in Redis for a given key.
   * @param {string} key The key to look up.
   * @returns {Promise<string|null>} The value associated with the key.
   */
  async get(key) {
    try {
      return await this.getAsync(key);
    } catch (err) {
      console.error(`Error getting key '${key}':`, err);
      return null;
    }
  }

  /**
   * Stores a key-value pair in Redis with an expiration.
   * @param {string} key The key to set.
   * @param {string|number} value The value to store.
   * @param {number} duration The expiration time in seconds.
   * @returns {Promise<void>}
   */
  async set(key, value, duration) {
    try {
      await this.setAsync(key, duration, value);
    } catch (err) {
      console.error(`Error setting key '${key}':`, err);
    }
  }

  /**
   * Deletes a key and its value from Redis.
   * @param {string} key The key to delete.
   * @returns {Promise<void>}
   */
  async del(key) {
    try {
      await this.delAsync(key);
    } catch (err) {
      console.error(`Error deleting key '${key}':`, err);
    }
  }
}

// Create and export a single instance of the client (Singleton pattern)
const redisClient = new RedisClient();
export default redisClient;
