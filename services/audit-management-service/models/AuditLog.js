const mongoose = require('mongoose');

/**
 * AuditLog Schema
 * Persists every significant event that occurs across the healthcare platform.
 * Populated by the Kafka consumer on each received message.
 */
const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'userId is required'],
      index: true,
    },
    userRole: {
      type: String,
      enum: ['PATIENT', 'DOCTOR', 'ADMIN', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    serviceName: {
      type: String,
      required: [true, 'serviceName is required'],
      index: true,
    },
    // action maps to the Kafka eventType (e.g. LOGIN_SUCCESS, APPOINTMENT_BOOKED)
    action: {
      type: String,
      required: [true, 'action is required'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'description is required'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED'],
      default: 'SUCCESS',
    },
    ipAddress: {
      type: String,
      default: '0.0.0.0',
    },
    // Arbitrary extra data (file names, payment IDs, appointment IDs, etc.)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // The Kafka topic this event was received on
    topic: {
      type: String,
      required: [true, 'topic is required'],
    },
  },
  {
    timestamps: true,   // Adds createdAt / updatedAt managed by Mongoose
    versionKey: false,
  }
);

// Compound indexes for the most common query patterns
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ serviceName: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
