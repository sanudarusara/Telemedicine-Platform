// kafka.js — Kafka producer for Auth Service
// Publishes authentication events (user-registered, user-deactivated, login-success/failed)

const { Kafka, logLevel } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'auth-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  logLevel: logLevel.ERROR,
});

const producer = kafka.producer();

let connected = false;

async function connectProducer() {
  if (connected) return;
  try {
    await producer.connect();
    connected = true;
    console.log('[kafka] Producer connected to', process.env.KAFKA_BROKER || 'localhost:9092');
  } catch (err) {
    console.error('[kafka] Failed to connect producer:', err.message);
    throw err;
  }
}

async function publishEvent(topic, message) {
  if (!topic) throw new Error('Topic is required');

  if (!connected) {
    await connectProducer();
  }

  if (!connected) {
    console.error('[kafka] Producer not connected — event not published', topic);
    return null;
  }

  try {
    const result = await producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
    console.log('[kafka] Event published', { topic });
    return result;
  } catch (err) {
    console.error('[kafka] Failed to publish event:', err.message, 'topic=', topic);
    return null;
  }
}

async function disconnectProducer() {
  if (!connected) return;
  try {
    await producer.disconnect();
    connected = false;
  } catch (err) {
    console.error('[kafka] Error disconnecting producer:', err.message);
  }
}

process.on('SIGINT', disconnectProducer);
process.on('SIGTERM', disconnectProducer);

module.exports = { connectProducer, publishEvent, disconnectProducer };
