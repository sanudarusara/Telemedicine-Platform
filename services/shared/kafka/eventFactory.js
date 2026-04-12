/**
 * Event Factory
 * Creates a standardized Kafka event payload structure used by all services.
 * Ensures every event emitted on the platform has a consistent shape.
 *
 * @param {Object} params
 * @param {string} params.eventType     - Event identifier (use EVENTS constants)
 * @param {string} params.userId        - ID of the user triggering the event
 * @param {string} [params.userRole]    - Role of the user (PATIENT | DOCTOR | ADMIN)
 * @param {string} params.serviceName   - Name of the originating service
 * @param {string} params.description   - Human-readable description of the event
 * @param {string} [params.status]      - SUCCESS or FAILED (default: SUCCESS)
 * @param {string} [params.ipAddress]   - Originating IP address
 * @param {Object} [params.metadata]    - Arbitrary extra data for the event
 * @returns {Object} Standardized event object ready for Kafka serialization
 */
const createEvent = ({
  eventType,
  userId,
  userRole = 'UNKNOWN',
  serviceName,
  description,
  status = 'SUCCESS',
  ipAddress = '0.0.0.0',
  metadata = {},
}) => {
  if (!eventType) throw new Error('eventFactory: eventType is required');
  if (!userId)    throw new Error('eventFactory: userId is required');
  if (!serviceName) throw new Error('eventFactory: serviceName is required');
  if (!description) throw new Error('eventFactory: description is required');

  return {
    eventType,
    userId,
    userRole,
    serviceName,
    description,
    status,
    timestamp: new Date().toISOString(),
    ipAddress,
    metadata,
  };
};

module.exports = { createEvent };
