import mongoose, { Connection } from 'mongoose';

/**
 * Shape of the cached connection object stored on the global scope.
 */
interface MongooseCache {
  conn: Connection | null;
  promise: Promise<Connection> | null;
}

/**
 * Augment the Node.js global type to include our cached Mongoose connection.
 *
 * This avoids TypeScript errors when we attach the cache to `global`.
 */
declare global {
  // `var` is required here because we are augmenting the global scope.
  // eslint-disable-next-line no-var
  var _mongoose: MongooseCache | undefined;
}

/**
 * Use a global cache in development to prevent creating multiple
 * MongoDB connections due to Next.js hot reloading.
 *
 * In production, the global scope is not reused across server instances,
 * but using the same logic keeps the API consistent and safe.
 */
const cached: MongooseCache = global._mongoose ?? { conn: null, promise: null };

if (!global._mongoose) {
  global._mongoose = cached;
}

/**
 * Establishes (or reuses) a Mongoose connection.
 *
 * - Reuses an existing connection if available.
 * - Otherwise, creates a new connection and caches the promise.
 *
 * Throws a descriptive error if the MongoDB connection string is missing.
 */
export async function connectToDatabase(): Promise<Connection> {
  if (cached.conn) {
    // Reuse existing connection.
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error(
        'Please define the MONGODB_URI environment variable inside your environment configuration.'
      );
    }

    // Create a new connection promise and store it in the cache.
    cached.promise = mongoose.connect(uri).then((mongooseInstance) => {
      return mongooseInstance.connection;
    });
  }

  // Await the cached promise (shared by all callers) and cache the resolved connection.
  cached.conn = await cached.promise;
  return cached.conn;
}

/**
 * Optionally, you can expose the underlying Mongoose instance
 * for defining schemas and models in a type-safe way.
 */
export { mongoose };
