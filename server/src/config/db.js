/**
 * Database connection.
 * The URI comes from .env, so switching from a local database to the
 * shared MongoDB Atlas cluster is a one-line change with no code edits.
 */
import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy server/.env.example to server/.env first.');
  }

  mongoose.set('strictQuery', true);

  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  const target = uri.startsWith('mongodb+srv') ? 'shared cluster' : 'local database';
  console.log(`[db] connected to ${conn.connection.name} (${target})`);

  mongoose.connection.on('error', (err) => console.error('[db] error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));

  return conn;
}

export async function disconnectDB() {
  await mongoose.connection.close();
}
