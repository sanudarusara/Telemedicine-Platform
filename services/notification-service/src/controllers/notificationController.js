const notificationService = require('../services/notificationService');

class NotificationController {
  async sendNotification(req, res, next) {
    try {
      const result = await notificationService.sendNotification(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async sendAppointmentNotifications(req, res, next) {
    try {
      const { appointment, eventType } = req.body;
      const result = await notificationService.sendAppointmentNotifications(appointment, eventType);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getNotifications(req, res, next) {
    try {
      const { userId, limit, offset } = req.query;
      const notifications = await notificationService.getNotifications(userId, limit, offset);
      res.json({ success: true, count: notifications.length, data: notifications });
    } catch (error) {
      next(error);
    }
  }

  async getNotificationById(req, res, next) {
    try {
      const notification = await notificationService.getNotificationById(req.params.id);
      if (!notification) return res.status(404).json({ error: 'Notification not found' });
      res.json({ success: true, data: notification });
    } catch (error) {
      next(error);
    }
  }

  async getFailedNotifications(req, res, next) {
    try {
      const notifications = await notificationService.getFailedNotifications();
      res.json({ success: true, count: notifications.length, data: notifications });
    } catch (error) {
      next(error);
    }
  }

  async retryFailedNotification(req, res, next) {
    try {
      const result = await notificationService.retryFailedNotification(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async healthCheck(req, res) {
    res.json({
      status: 'OK',
      service: 'notification-service',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new NotificationController();
