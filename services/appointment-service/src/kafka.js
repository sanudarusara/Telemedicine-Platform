const { Kafka } = require('kafkajs');

const brokersEnv = process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER || 'localhost:9092';
const brokers = brokersEnv.split(',').map(b => b.trim());
const clientId = process.env.KAFKA_CLIENT_ID || 'appointment-service';

const kafka = new Kafka({ clientId, brokers });
console.log('[kafka] Brokers configured:', brokers.join(','));
const producer = kafka.producer();
let connected = false;

async function connectProducer() {
  if (connected) return;
  try {
    await producer.connect();
    connected = true;
    console.log('[kafka] Producer connected');
  } catch (err) {
    console.error('[kafka] Failed to connect producer:', err.message);
  }
}

// Try to connect eagerly but don't crash the service if Kafka is unavailable.
connectProducer();

async function publish(topic, event) {
  try {
    if (!connected) await connectProducer();
    const payload = {
      topic,
      messages: [
        { key: event.userId ? String(event.userId) : undefined, value: JSON.stringify(event) }
      ]
    };
    const res = await producer.send(payload);
    return res;
  } catch (err) {
    console.error(`[kafka] Failed to publish to ${topic}:`, err.message);
    return null;
  }
}

module.exports = { publish, _producer: producer };
