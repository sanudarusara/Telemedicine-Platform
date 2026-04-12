// kafka.js — Kafka producer helper using kafkajs
// Connects to a Kafka broker and provides a reusable `publishEvent` function

const { Kafka, logLevel } = require('kafkajs');

// Create Kafka client pointed at localhost:9092
// Adjust brokers via environment variable if needed.
const kafka = new Kafka({
  clientId: 'patient-management-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  logLevel: logLevel.ERROR,
});

// Single producer instance reused for all publishes
const producer = kafka.producer();

let connected = false;

/**
 * Connect the producer to the Kafka cluster. Called once on service startup.
 * Handles and logs any connection errors gracefully.
 */
async function connectProducer() {
  if (connected) return;
  try {
    await producer.connect();
    connected = true;
    console.log('[kafka] Producer connected to', process.env.KAFKA_BROKER || 'localhost:9092');
  } catch (err) {
    console.error('[kafka] Failed to connect producer:', err.message);
    // Do not crash the service — caller can attempt reconnect or log the failure.
  }
}

/**
 * Publish an event to a Kafka topic.
 * - `topic` should be an existing topic name.
 * - `message` will be JSON.stringified before sending.
 * Returns the result of `producer.send()` when successful.
 */
async function publishEvent(topic, message) {
  if (!topic) throw new Error('Topic is required');

  // Ensure message is JSON string
  const value = JSON.stringify(message);

  // Attempt to connect if not already connected
  if (!connected) {
    await connectProducer();
  }

  if (!connected) {
    // If still not connected, log and return without throwing so callers
    // can continue; depending on requirements you may want to buffer events.
    console.error('[kafka] Producer not connected — event not published', topic);
    return null;
  }

  try {
    const result = await producer.send({
      topic,
      messages: [{ value }],
    });

    // Log successful publish with returned metadata for observability
    console.log('[kafka] Event published', { topic, result });
    return result;
  } catch (err) {
    console.error('[kafka] Failed to publish event:', err.message, 'topic=', topic);
    // Do not throw to avoid crashing request handling; callers can choose to handle errors.
    return null;
  }
}

/**
 * Graceful shutdown: disconnect the producer when the Node process exits.
 */
async function disconnectProducer() {
  if (!connected) return;
  try {
    await producer.disconnect();
    connected = false;
    console.log('[kafka] Producer disconnected');
  } catch (err) {
    console.error('[kafka] Error disconnecting producer:', err.message);
  }
}

// Handle process signals for graceful shutdown
process.on('SIGINT', () => {
  disconnectProducer().finally(() => process.exit(0));
});
process.on('SIGTERM', () => {
  disconnectProducer().finally(() => process.exit(0));
});

module.exports = {
  connectProducer,
  publishEvent,
  disconnectProducer,
};
