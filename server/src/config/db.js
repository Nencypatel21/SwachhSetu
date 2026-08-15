const mongoose = require('mongoose');
const env = require('./env');

/**
 * Connects to MongoDB. Called once from server.js at boot.
 * No models are registered here — that starts in B1 (models/*.js).
 */
async function connectDB() {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(env.mongodbUri);
    console.log(`[db] connected: ${mongoose.connection.name}`);
  } catch (err) {
    console.error('[db] connection failed:', err.message);
    // Don't start the server against a dead DB — fail fast and loud.
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected');
  });
}

module.exports = connectDB;
