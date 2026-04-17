// kafka/consumer.js — Kafka consumer for Patient Management Service
// Listens for events from other services (e.g., user-registered from API Gateway)

const { Kafka, logLevel } = require('kafkajs');
const patientRepository = require('../repositories/patientRepository');
const { publishEvent } = require('../kafka');
const TOPICS = require('../../shared/kafka/topics');
const EVENTS = require('../../shared/kafka/events');
const { createEvent } = require('../../shared/kafka/eventFactory');

const kafka = new Kafka({
  clientId: 'patient-management-service-consumer',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  logLevel: logLevel.ERROR,
});

const consumer = kafka.consumer({ groupId: 'patient-service-group' });

let consumerConnected = false;

/**
 * Start the Kafka consumer and subscribe to topics
 */
async function startConsumer() {
  if (consumerConnected) return;

  try {
    await consumer.connect();
    consumerConnected = true;
    console.log('[kafka-consumer] Connected to', process.env.KAFKA_BROKER || 'localhost:9092');

    // Subscribe to the user-registered topic
    await consumer.subscribe({ 
      topic: TOPICS.USER_REGISTERED, 
      fromBeginning: false // Only process new messages
    });

    // Subscribe to user-deactivated topic
    await consumer.subscribe({ 
      topic: TOPICS.USER_DEACTIVATED, 
      fromBeginning: false
    });

    console.log('[kafka-consumer] Subscribed to:', TOPICS.USER_REGISTERED, TOPICS.USER_DEACTIVATED);

    // Start consuming messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const payload = JSON.parse(message.value.toString());
          console.log('[kafka-consumer] Received event:', { topic, payload });

          // Handle user-registered events
          if (topic === TOPICS.USER_REGISTERED) {
            await handleUserRegistered(payload);
          } else if (topic === TOPICS.USER_DEACTIVATED) {
            await handleUserDeactivated(payload);
          }
        } catch (err) {
          console.error('[kafka-consumer] Error processing message:', err.message);
        }
      },
    });

    console.log('[kafka-consumer] Now listening for events...');
  } catch (err) {
    console.error('[kafka-consumer] Failed to start consumer:', err.message);
  }
}

/**
 * Handle user-registered event by creating a Patient profile
 */
async function handleUserRegistered(payload) {
  try {
    const userId = payload.userId || payload.metadata?.userId;
    const email = payload.metadata?.email;
    const name = payload.metadata?.name;
    const role = payload.userRole || payload.metadata?.role;

    // Only create Patient profile for PATIENT role
    if (role !== 'PATIENT') {
      console.log(`[kafka-consumer] Skipping patient creation for role: ${role}`);
      return;
    }

    // Check if patient profile already exists (idempotency)
    const existingPatient = await patientRepository.findByUserId(userId);
    if (existingPatient) {
      console.log(`[kafka-consumer] Patient profile already exists for userId: ${userId}`);
      return;
    }

    // Create empty Patient profile
    const patient = await patientRepository.create({ userId });

    console.log(`[kafka-consumer] ✓ Created Patient profile for ${name} (${email}):`, patient._id);

    // Publish PATIENT_REGISTERED so downstream services (audit, notification) are notified
    publishEvent(TOPICS.PATIENT_REGISTERED, createEvent({
      eventType: EVENTS.PATIENT_REGISTERED,
      userId,
      userRole: 'PATIENT',
      serviceName: 'patient-management-service',
      description: `Patient profile created for ${email}`,
      status: 'SUCCESS',
      metadata: { patientId: patient._id.toString(), email, name },
    })).catch((err) => {
      console.error('[kafka-consumer] Failed to publish PATIENT_REGISTERED event:', err.message);
    });
  } catch (err) {
    console.error('[kafka-consumer] Error creating patient profile:', err.message);
  }
}

/**
 * Handle user-deactivated event by marking patient as inactive
 */
async function handleUserDeactivated(payload) {
  try {
    const userId = payload.userId || payload.metadata?.userId;
    const role = payload.userRole || payload.metadata?.role;

    // Only handle PATIENT deactivations
    if (role !== 'PATIENT') {
      console.log(`[kafka-consumer] Skipping patient deactivation for role: ${role}`);
      return;
    }

    // Find and update patient status
    const patient = await patientRepository.findByUserId(userId);
    if (!patient) {
      console.log(`[kafka-consumer] No patient profile found for userId: ${userId}`);
      return;
    }

    // Mark patient as inactive (you may need to add this field to your schema)
    patient.isActive = false;
    await patient.save();

    console.log(`[kafka-consumer] ✓ Deactivated Patient profile for userId: ${userId}`);

    // Publish PATIENT_DEACTIVATED so downstream services (audit, notification) are notified
    publishEvent(TOPICS.PATIENT_DEACTIVATED, createEvent({
      eventType: EVENTS.PATIENT_DEACTIVATED,
      userId,
      userRole: 'PATIENT',
      serviceName: 'patient-management-service',
      description: `Patient profile deactivated for userId: ${userId}`,
      status: 'SUCCESS',
      metadata: { patientId: patient._id.toString() },
    })).catch((err) => {
      console.error('[kafka-consumer] Failed to publish PATIENT_DEACTIVATED event:', err.message);
    });
  } catch (err) {
    console.error('[kafka-consumer] Error deactivating patient profile:', err.message);
  }
}

/**
 * Gracefully disconnect the consumer
 */
async function stopConsumer() {
  if (!consumerConnected) return;

  try {
    await consumer.disconnect();
    consumerConnected = false;
    console.log('[kafka-consumer] Disconnected');
  } catch (err) {
    console.error('[kafka-consumer] Error disconnecting:', err.message);
  }
}

// Handle process signals for graceful shutdown
process.on('SIGINT', () => {
  stopConsumer().finally(() => process.exit(0));
});
process.on('SIGTERM', () => {
  stopConsumer().finally(() => process.exit(0));
});

module.exports = {
  startConsumer,
  stopConsumer,
};
process.on('SIGTERM', () => {
  stopConsumer().finally(() => process.exit(0));
});

module.exports = {
  startConsumer,
  stopConsumer,
};
