const { Kafka } = require('kafkajs');

/**
 * Kafka client configured from environment variables.
 * Supports comma-separated broker list: KAFKA_BROKER=host1:9092,host2:9092
 */
const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'audit-management-service',
  brokers: (process.env.KAFKA_BROKER || 'localhost:9092').split(','),
  retry: {
    initialRetryTime: 300,
    retries: 8,
  },
});

module.exports = kafka;
