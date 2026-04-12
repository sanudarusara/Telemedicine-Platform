/**
 * Shared Kafka Topic Names
 * Central definition used by all services in the healthcare platform.
 * Import this instead of hardcoding topic strings anywhere.
 */
const TOPICS = {
  // Aggregated event topics for different domains
  PATIENT_EVENTS: 'patient-events',
  DOCTOR_EVENTS: 'doctor-events',
  APPOINTMENT_EVENTS: 'appointment-events',
  PAYMENT_EVENTS: 'payment-events',
  NOTIFICATION_EVENTS: 'notification-events',
  AUTH_EVENTS: 'auth-events',
  ADMIN_EVENTS: 'admin-events',
  
  // Specific event topics for direct publishing
  USER_REGISTERED: 'user-registered',
  USER_DEACTIVATED: 'user-deactivated',
  PATIENT_REGISTERED: 'patient-registered',
  PATIENT_UPDATED: 'patient-updated',
  PATIENT_DEACTIVATED: 'patient-deactivated',
  REPORT_UPLOADED: 'report-uploaded',
  REPORT_DELETED: 'report-deleted',
};

module.exports = TOPICS;
