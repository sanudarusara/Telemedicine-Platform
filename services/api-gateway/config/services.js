/**
 * Service URLs Configuration
 *
 * Internal URLs for all microservices that the gateway routes to.
 * In Docker Compose these use service names (e.g. http://auth-service:5000).
 * In local development they fall back to localhost.
 */
module.exports = {
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:5000',
  PATIENT_SERVICE_URL: process.env.PATIENT_SERVICE_URL || 'http://localhost:5001',
  AUDIT_SERVICE_URL: process.env.AUDIT_SERVICE_URL || 'http://localhost:5002',
  NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5003',
  PAYMENT_SERVICE_URL: process.env.PAYMENT_SERVICE_URL || 'http://localhost:5004',
  AI_SYMPTOM_SERVICE_URL: process.env.AI_SYMPTOM_SERVICE_URL || 'http://localhost:5005',

  // Internal API key for secure service-to-service communication
  INTERNAL_API_KEY: process.env.INTERNAL_API_KEY || 'gateway-secret-key-change-in-production',
};
