/**
 * Shared Kafka Event Types
 * Standardized event type identifiers used by all producers and consumers
 * across the healthcare platform. Never hardcode event strings — use these constants.
 */
const EVENTS = {
  // Authentication Events
  USER_REGISTERED: 'USER_REGISTERED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  ROLE_UPDATED: 'ROLE_UPDATED',
  
  // Patient Events
  PATIENT_REGISTERED: 'PATIENT_REGISTERED',
  PATIENT_UPDATED: 'PATIENT_UPDATED',
  PATIENT_DEACTIVATED: 'PATIENT_DEACTIVATED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  
  // Medical Records Events
  PRESCRIPTION_ADDED: 'PRESCRIPTION_ADDED',
  MEDICAL_HISTORY_ADDED: 'MEDICAL_HISTORY_ADDED',
  
  // Report Events
  REPORT_UPLOADED: 'REPORT_UPLOADED',
  REPORT_DELETED: 'REPORT_DELETED',
  
  // Doctor Events
  DOCTOR_VERIFIED: 'DOCTOR_VERIFIED',
  
  // Appointment Events
  APPOINTMENT_BOOKED: 'APPOINTMENT_BOOKED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  
  // Payment Events
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  
  // Admin Events
  USER_DELETED: 'USER_DELETED',
  STAFF_SELECTED: 'STAFF_SELECTED',
};

module.exports = EVENTS;
