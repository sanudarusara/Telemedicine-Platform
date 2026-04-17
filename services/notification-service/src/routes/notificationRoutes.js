// services/notification-service/src/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationController');

router.post('/send', controller.sendNotification);
router.post('/appointment', controller.sendAppointmentNotifications);
router.get('/', controller.getNotifications);
router.get('/failed', controller.getFailedNotifications);
router.get('/:id', controller.getNotificationById);
router.post('/:id/retry', controller.retryFailedNotification);
router.patch('/:id/read', controller.markAsRead);
router.get('/health', controller.healthCheck);

module.exports = router;