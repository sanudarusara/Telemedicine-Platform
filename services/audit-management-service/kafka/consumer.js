const kafka = require('../config/kafka');
const AuditLog = require('../models/AuditLog');
const { getUserRole } = require('../services/userService');
const TOPICS = require('../../shared/kafka/topics');

// Flat list of all topic strings to subscribe to
const TOPIC_LIST = Object.values(TOPICS);

/**
 * Maps Kafka topic → service name used when the event payload
 * does not include a serviceName field.
 */
const TOPIC_TO_SERVICE = {
  [TOPICS.PATIENT_EVENTS]:      'patient-service',
  [TOPICS.DOCTOR_EVENTS]:       'doctor-service',
  [TOPICS.APPOINTMENT_EVENTS]:  'appointment-service',
  [TOPICS.PAYMENT_EVENTS]:      'payment-service',
  [TOPICS.NOTIFICATION_EVENTS]: 'notification-service',
  [TOPICS.AUTH_EVENTS]:         'auth-service',
  [TOPICS.ADMIN_EVENTS]:        'admin-service',
  [TOPICS.USER_REGISTERED]:     'api-gateway',
  [TOPICS.USER_DEACTIVATED]:    'api-gateway',
  [TOPICS.PATIENT_REGISTERED]:  'patient-service',
  [TOPICS.PATIENT_UPDATED]:     'patient-service',
  [TOPICS.PATIENT_DEACTIVATED]: 'patient-service',
  [TOPICS.REPORT_UPLOADED]:     'patient-service',
  [TOPICS.REPORT_DELETED]:      'patient-service',
};

/**
 * Topics that use the PMS raw format instead of the standard eventFactory shape.
 * These need to be normalized before the standard validation/processing path.
 */
const PMS_RAW_TOPICS = new Set([
  TOPICS.PATIENT_REGISTERED,
  TOPICS.PATIENT_UPDATED,
  TOPICS.PATIENT_DEACTIVATED,
]);

/**
 * Normalizes a PMS-native message into the standard audit event shape.
 * PMS publishes: { user: { id, name, email, role }, patientId, timestamp }
 */
const normalizePmsMessage = (raw, topic) => {
  const eventTypeMap = {
    [TOPICS.PATIENT_REGISTERED]:  'PATIENT_REGISTERED',
    [TOPICS.PATIENT_UPDATED]:     'PATIENT_UPDATED',
    [TOPICS.PATIENT_DEACTIVATED]: 'PATIENT_DEACTIVATED',
  };
  return {
    eventType:   eventTypeMap[topic] || topic.toUpperCase().replace(/-/g, '_'),
    userId:      raw.user?.id,
    userRole:    raw.user?.role || 'PATIENT',
    serviceName: 'patient-service',
    description: `${eventTypeMap[topic] || topic}: ${raw.user?.name || raw.user?.id}`,
    status:      'SUCCESS',
    ipAddress:   '0.0.0.0',
    timestamp:   raw.timestamp,
    metadata: {
      patientId: raw.patientId,
      name:      raw.user?.name,
      email:     raw.user?.email,
    },
  };
};

/**
 * Validates that a parsed message has the minimum required fields.
 * Throws a descriptive error if validation fails.
 *
 * @param {Object} msg - Parsed event object
 */
const validateMessage = (msg) => {
  if (!msg.eventType) throw new Error('Missing required field: eventType');
  if (!msg.userId)    throw new Error('Missing required field: userId');
};

/**
 * Starts the Kafka consumer for the audit service.
 *
 * Flow for each message:
 *   1. Decode and JSON-parse the message value safely
 *   2. Validate required fields (eventType, userId)
 *   3. Resolve userRole — use event payload value if present,
 *      otherwise fetch synchronously from Patient Management Service
 *   4. Persist an AuditLog document to MongoDB
 *
 * Errors at any step are caught and logged; the consumer never crashes.
 * If the initial connection fails the function schedules a retry after 10 s.
 */
const startConsumer = async () => {
  const consumer = kafka.consumer({
    groupId: process.env.KAFKA_GROUP_ID || 'audit-service-group',
  });

  try {
    await consumer.connect();
    console.log('[Kafka Consumer] Connected to Kafka broker');

    // Subscribe to every topic defined in the shared config
    for (const topic of TOPIC_LIST) {
      await consumer.subscribe({ topic, fromBeginning: true });
      console.log(`[Kafka Consumer] Subscribed → ${topic}`);
    }

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          // ── Step 1: Decode raw message ─────────────────────────────────
          const rawValue = message.value?.toString();
          if (!rawValue) {
            console.warn(`[Kafka Consumer] Empty message on topic: ${topic} (partition ${partition})`);
            return;
          }

          // ── Step 2: Parse JSON safely ──────────────────────────────────
          let eventData;
          try {
            eventData = JSON.parse(rawValue);
          } catch (parseError) {
            console.error(
              `[Kafka Consumer] JSON parse error on ${topic}: ${parseError.message}`,
              { rawValue: rawValue.slice(0, 200) }
            );
            return;
          }

          // ── Step 3: Normalize PMS-native message format if needed ────
          if (PMS_RAW_TOPICS.has(topic)) {
            eventData = normalizePmsMessage(eventData, topic);
          }

          // ── Step 4: Validate required fields ──────────────────────────
          try {
            validateMessage(eventData);
          } catch (validationError) {
            console.error(`[Kafka Consumer] Validation failed: ${validationError.message}`);
            return;
          }

          const {
            eventType,
            userId,
            userRole: eventUserRole,
            serviceName,
            description,
            status    = 'SUCCESS',
            ipAddress = '0.0.0.0',
            metadata  = {},
            timestamp,
          } = eventData;

          // ── Step 5: Resolve userRole ───────────────────────────────────
          // Prefer the role embedded in the event; only call the Patient
          // Management Service when the producer did not include it.
          let resolvedRole = eventUserRole;
          if (!resolvedRole) {
            console.log(
              `[Kafka Consumer] userRole absent in event — fetching from Patient Service (userId: ${userId})`
            );
            resolvedRole = await getUserRole(userId);
          }

          // ── Step 6: Persist audit log ──────────────────────────────────
          const auditLog = new AuditLog({
            userId,
            userRole:    resolvedRole || 'UNKNOWN',
            serviceName: serviceName  || TOPIC_TO_SERVICE[topic] || 'unknown-service',
            action:      eventType,
            description: description  || `Event received: ${eventType}`,
            timestamp:   timestamp ? new Date(timestamp) : new Date(),
            status,
            ipAddress,
            metadata,
            topic,
          });

          await auditLog.save();
          console.log(
            `[Kafka Consumer] Audit saved | topic: ${topic} | action: ${eventType} | ` +
            `userId: ${userId} | role: ${resolvedRole} | status: ${status}`
          );
        } catch (err) {
          // Catch-all — never let a single bad message crash the consumer loop
          console.error(
            `[Kafka Consumer] Unhandled error processing message on ${topic}: ${err.message}`,
            { stack: err.stack }
          );
        }
      },
    });

  } catch (err) {
    console.error(`[Kafka Consumer] Fatal startup error: ${err.message}`);
    // Retry after a delay instead of crashing the process
    console.log('[Kafka Consumer] Retrying connection in 10 seconds…');
    setTimeout(startConsumer, 10_000);
  }
};

module.exports = { startConsumer };
