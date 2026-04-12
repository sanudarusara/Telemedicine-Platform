const { v4: uuidv4 } = require('uuid');
const Notification = require('../models/Notification');
const emailService = require('./emailService');
const smsService = require('./smsService');
const whatsappService = require('./whatsappService');

class NotificationService {
  async sendNotification(notificationData) {
    const notification = new Notification({
      notificationId: uuidv4(),
      ...notificationData,
      status: 'pending'
    });
        
    await notification.save();
        
    let result;
    if (notificationData.type === 'email') {
      result = await emailService.sendEmail(
        notificationData.recipient.email,
        notificationData.subject,
        notificationData.htmlContent || notificationData.message,
        notificationData.message
      );
    } else if (notificationData.type === 'sms') {
      result = await smsService.sendSMS(
        notificationData.recipient.phone,
        notificationData.message
      );
    } else if (notificationData.type === 'whatsapp') {
      result = await whatsappService.sendWhatsApp(
        notificationData.recipient.phone,
        notificationData.message
      );
    }
        
    notification.status = result.success ? 'sent' : 'failed';
    if (result.success) notification.sentAt = new Date();
    if (result.error) notification.error = result.error;
        
    await notification.save();
        
    return {
      success: result.success,
      notificationId: notification.notificationId,
      ...result
    };
  }

  async sendAppointmentNotification(appointment, eventType, userType) {
    const isPatient = userType === 'patient';
    const recipient = {
      id: isPatient ? appointment.patientId : appointment.doctorId,
      email: isPatient ? appointment.patientEmail : appointment.doctorEmail,
      phone: isPatient ? appointment.patientPhone : appointment.doctorPhone
    };
        
    let subject, message, htmlContent, whatsappMessage, smsMessage;
        
    if (eventType === 'created') {
      const template = emailService.getAppointmentCreatedTemplate(appointment, userType);
      subject = template.subject;
      htmlContent = template.html;
      message = emailService.stripHtml(htmlContent);
      whatsappMessage = whatsappService.getAppointmentCreatedMessage(appointment, userType);
      smsMessage = smsService.getAppointmentCreatedSMS(appointment, userType);
    } else {
      const template = emailService.getAppointmentStatusUpdateTemplate(appointment, userType, appointment.status);
      subject = template.subject;
      htmlContent = template.html;
      message = emailService.stripHtml(htmlContent);
      whatsappMessage = whatsappService.getAppointmentStatusUpdateMessage(appointment, userType, appointment.status);
      smsMessage = smsService.getAppointmentStatusUpdateSMS(appointment, userType, appointment.status);
    }
        
    // Send Email
    const emailResult = await this.sendNotification({
      userId: recipient.id,
      userType: userType,
      type: 'email',
      recipient: { email: recipient.email },
      subject: subject,
      message: message,
      htmlContent: htmlContent,
      appointmentId: appointment.appointmentId
    });
        
    // Send WhatsApp (preferred)
    const whatsappResult = await this.sendNotification({
      userId: recipient.id,
      userType: userType,
      type: 'whatsapp',
      recipient: { phone: recipient.phone },
      message: whatsappMessage,
      appointmentId: appointment.appointmentId
    });
        
    // Send SMS (fallback)
    const smsResult = await this.sendNotification({
      userId: recipient.id,
      userType: userType,
      type: 'sms',
      recipient: { phone: recipient.phone },
      message: smsMessage,
      appointmentId: appointment.appointmentId
    });
        
    return { email: emailResult, whatsapp: whatsappResult, sms: smsResult };
  }

  async sendAppointmentNotifications(appointment, eventType) {
    const patientResult = await this.sendAppointmentNotification(appointment, eventType, 'patient');
    const doctorResult = await this.sendAppointmentNotification(appointment, eventType, 'doctor');
        
    return { patient: patientResult, doctor: doctorResult };
  }

  async getNotifications(userId, limit = 50, offset = 0) {
    return await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);
  }

  async getNotificationById(notificationId) {
    return await Notification.findOne({ notificationId });
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
