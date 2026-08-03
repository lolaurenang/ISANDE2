/**
 * Entry point: load env, connect to MongoDB, then listen.
 * The database is connected before the port opens so the API never
 * accepts a request it cannot serve.
 */
import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`[api] Andoy's Enterprises API on http://localhost:${PORT}/api`);
      console.log(`[api] health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('[api] failed to start:', err.message);
    process.exit(1);
  }
}

process.on('unhandledRejection', (err) => {
  console.error('[api] unhandled rejection:', err);
  process.exit(1);
});

start();
