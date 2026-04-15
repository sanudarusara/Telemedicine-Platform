// services/notification-service/src/services/notificationService.js
const { v4: uuidv4 } = require('uuid');
const Notification = require('../models/Notification');

class NotificationService {
  constructor() {
    this.appointmentServiceURL = process.env.APPOINTMENT_SERVICE_URL || 'http://appointment-service:3001';
  }

  async sendAppointmentNotification(appointment, eventType, userType) {
    const isPatient = userType === 'patient';
    
    // Use the actual names from appointment data
    const patientName = appointment.patientName || 'Patient';
    const doctorName = appointment.doctorName || 'Doctor';
    
    // Only create notification for the specific user type
    const recipientId = isPatient ? appointment.patientId : appointment.doctorId;
    const recipientName = isPatient ? patientName : doctorName;
    const otherPartyName = isPatient ? doctorName : patientName;
    
    const appointmentDate = new Date(appointment.date);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = appointment.timeSlot || appointmentDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let subject, message;
    
    switch(eventType) {
      case 'created':
        subject = `Appointment Confirmed - ${formattedDate} with ${otherPartyName}`;
        message = `Dear ${recipientName},\n\nYour appointment has been successfully booked!\n\n📋 Appointment Details:\n• ${isPatient ? 'Doctor' : 'Patient'}: ${otherPartyName}\n• Specialty: ${appointment.specialty || 'General Medicine'}\n• Date: ${formattedDate}\n• Time: ${formattedTime}\n• Type: ${appointment.consultationType === 'video' ? 'Video Consultation' : 'In-Clinic Visit'}\n${appointment.symptoms ? `• Symptoms: ${appointment.symptoms}\n` : ''}• Status: ${appointment.status}\n\nThank you for choosing our healthcare platform!`;
        break;
        
      case 'confirmed':
        subject = `Appointment Confirmed - ${formattedDate}`;
        message = `Dear ${recipientName},\n\nYour appointment has been CONFIRMED!\n\n📋 Appointment Details:\n• ${isPatient ? 'Doctor' : 'Patient'}: ${otherPartyName}\n• Date: ${formattedDate}\n• Time: ${formattedTime}\n• Status: CONFIRMED ✅\n\nPlease arrive 10 minutes early.`;
        break;
        
      case 'cancelled':
        subject = `Appointment Cancelled - ${formattedDate}`;
        message = `Dear ${recipientName},\n\nYour appointment has been CANCELLED.\n\n📋 Appointment Details:\n• ${isPatient ? 'Doctor' : 'Patient'}: ${otherPartyName}\n• Date: ${formattedDate}\n• Time: ${formattedTime}\n• Status: CANCELLED ❌\n\nTo book a new appointment, please log in to your account.`;
        break;
        
      case 'rescheduled':
        subject = `Appointment Rescheduled - ${formattedDate}`;
        message = `Dear ${recipientName},\n\nYour appointment has been RESCHEDULED.\n\n📋 New Appointment Details:\n• ${isPatient ? 'Doctor' : 'Patient'}: ${otherPartyName}\n• New Date: ${formattedDate}\n• New Time: ${formattedTime}\n• Type: ${appointment.consultationType === 'video' ? 'Video Consultation' : 'In-Clinic Visit'}\n• Status: ${appointment.status}\n\nThank you for updating your schedule!`;
        break;
        
      default:
        subject = `Appointment Update - ${formattedDate}`;
        message = `Dear ${recipientName},\n\nYour appointment status has been updated to: ${appointment.status.toUpperCase()}\n\n${isPatient ? 'Doctor' : 'Patient'}: ${otherPartyName}\nDate: ${formattedDate}\nTime: ${formattedTime}`;
    }
    
    // Save notification ONLY for this specific user
    const notification = new Notification({
      notificationId: uuidv4(),
      userId: recipientId,
      userType: userType,
      type: 'push',
      subject: subject,
      message: message,
      appointmentId: appointment.appointmentId,
      appointmentStatus: appointment.status,
      read: false,
      status: 'sent',
      sentAt: new Date(),
      createdAt: new Date(),
      appointmentSnapshot: {
        doctorName: doctorName,
        patientName: patientName,
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        status: appointment.status,
        specialty: appointment.specialty,
        clinic: appointment.clinic || 'Healthcare Center'
      }
    });
    
    await notification.save();
    console.log(`[NOTIFICATION] Created ${eventType} notification for ${userType}: ${recipientName} (${recipientId})`);
    
    return { success: true, notificationId: notification.notificationId };
  }

  async sendAppointmentNotifications(appointment, eventType) {
    if (!appointment) return { error: 'Appointment not found' };
    
    // Send separate notifications to patient and doctor
    const patientResult = await this.sendAppointmentNotification(appointment, eventType, 'patient');
    const doctorResult = await this.sendAppointmentNotification(appointment, eventType, 'doctor');
    
    return { patient: patientResult, doctor: doctorResult };
  }

  async getNotifications(userId, limit = 50, offset = 0) {
    // Only return notifications for this specific user
    return await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));
  }

  async getNotificationById(notificationId) {
    return await Notification.findOne({ notificationId });
  }

  async markAsRead(notificationId, read = true) {
    const notification = await Notification.findOne({ notificationId });
    if (!notification) throw new Error('Notification not found');
    notification.read = !!read;
    await notification.save();
    return notification;
  }

  async getFailedNotifications() {
    return await Notification.find({ status: 'failed' });
  }

  async retryFailedNotification(notificationId) {
    const notification = await Notification.findOne({ notificationId });
    if (!notification) throw new Error('Notification not found');
    
    notification.status = 'pending';
    notification.error = null;
    await notification.save();
    
    return await this.sendNotification(notification.toObject());
  }
}

module.exports = new NotificationService();