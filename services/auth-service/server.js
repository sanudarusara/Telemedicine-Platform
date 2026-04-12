require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const { connectProducer } = require('./config/kafka');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // 1. Connect to auth-management MongoDB database
  await connectDB();

  // 2. Connect Kafka producer (non-blocking — service still boots if Kafka is unavailable)
  try {
    await connectProducer();
    console.log('[server] Kafka producer ready');
  } catch (err) {
    console.error('[server] Kafka connection failed:', err.message);
    console.warn('[server] Continuing without Kafka — auth events will not be published');
  }

  // 3. Start HTTP server
  app.listen(PORT, () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  Auth Service running on port ${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Health: http://localhost:${PORT}/health`);
    console.log(`  Auth API: http://localhost:${PORT}/api/auth`);
    console.log(`${'='.repeat(60)}\n`);
  });
};

startServer().catch((err) => {
  console.error('[server] Fatal startup error:', err.message);
  process.exit(1);
});
