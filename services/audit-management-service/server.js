require('dotenv').config();

const app           = require('./app');
const connectDB     = require('./config/db');
const { startConsumer } = require('./kafka/consumer');

const PORT = process.env.PORT || 5002;

/**
 * Bootstrap sequence:
 *  1. Connect to MongoDB (required — exits on failure)
 *  2. Start Kafka consumer (non-blocking — failures are logged and retried)
 *  3. Start the Express HTTP server
 */
const startServer = async () => {
  // 1. Database connection
  await connectDB();

  // 2. Kafka consumer — start asynchronously; HTTP server boots regardless
  startConsumer().catch((err) => {
    console.error('[Server] Kafka consumer failed to start:', err.message);
  });

  // 3. HTTP server
  app.listen(PORT, () => {
    console.log(`[Server] Audit Management Service is running on port ${PORT}`);
    console.log(`[Server] Health check → http://localhost:${PORT}/health`);
    console.log(`[Server] Audit API    → http://localhost:${PORT}/api/audit`);
  });
};

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err.message);
  process.exit(1);
});
