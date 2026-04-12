// Load environment variables before anything else
require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const { connectProducer } = require('./kafka');
const { startConsumer } = require('./kafka/consumer');

const PORT = process.env.PORT || 5001;

// Connect to MongoDB, then start the HTTP server and Kafka consumer
connectDB()
  .then(async () => {
    try {
      // Initialize Kafka producer for publishing events
      await connectProducer();
      console.log('[server] ✓ Kafka producer ready');
      
      // Initialize Kafka consumer for receiving events (e.g., user-registered)
      await startConsumer();
      console.log('[server] ✓ Kafka consumer ready');
    } catch (err) {
      console.error('[server] Kafka connection failed:', err.message);
      console.warn('[server] Continuing without Kafka (events will not be published/consumed)');
    }

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`  🏥 Patient Management Service running on port ${PORT}`);
      console.log(`  📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  📤 Kafka Producer: Publishing patient events`);
      console.log(`  📥 Kafka Consumer: Listening for user-registered events`);
      console.log(`${'='.repeat(60)}\n`);
    });
  })
  .catch((error) => {
    console.error('[server] Failed to connect to MongoDB:', error.message);
    process.exit(1);
  });
