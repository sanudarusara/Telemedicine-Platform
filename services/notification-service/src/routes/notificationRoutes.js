const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationController');

router.post('/send', controller.sendNotification);
router.post('/appointment', controller.sendAppointmentNotifications);
router.get('/', controller.getNotifications);
router.get('/failed', controller.getFailedNotifications);
router.get('/:id', controller.getNotificationById);
router.post('/:id/retry', controller.retryFailedNotification);
router.get('/health', controller.healthCheck);

module.exports = router;
