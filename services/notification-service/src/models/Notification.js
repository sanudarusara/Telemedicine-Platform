const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true
  },
  userType: {
    type: String,
    enum: ['patient', 'doctor', 'admin'],
    required: true
  },
  type: {
    type: String,
    enum: ['email', 'sms', 'whatsapp', 'push'],
    required: true
  },
  recipient: {
    email: String,
    phone: String
  },
  subject: String,
  message: {
    type: String,
    required: true
  },
  htmlContent: String,
  appointmentId: String,
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  error: String,
  sentAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ status: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
