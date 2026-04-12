const express = require('express');
const router  = express.Router();

const {
  getAllLogs,
  getLogById,
  getLogsByUser,
  getLogsByService,
  getLogsByAction,
  getLogsByDateRange,
  deleteLog,
} = require('../controllers/auditController');

const { validateGatewayRequest, requireRole } = require('../middleware/gatewayAuth');

// NOTE: Static/named routes must be registered BEFORE dynamic /:id to avoid
// Express matching "date-range", "user", "service", "action" as an ObjectId.

// All requests come through the API Gateway which handles JWT verification.
// The gateway injects x-user-id and x-user-role headers for authorization.
// We validate the request came from gateway and check roles.

// GET /api/audit                              — All logs (paginated, sortable)
router.get('/', validateGatewayRequest, requireRole('ADMIN', 'DOCTOR'), getAllLogs);

// GET /api/audit/date-range?start=&end=       — Filter by date range
router.get('/date-range', validateGatewayRequest, requireRole('ADMIN', 'DOCTOR'), getLogsByDateRange);

// GET /api/audit/user/:userId                 — Logs for a specific user
router.get('/user/:userId', validateGatewayRequest, requireRole('ADMIN', 'DOCTOR'), getLogsByUser);

// GET /api/audit/service/:serviceName         — Logs from a specific service
router.get('/service/:serviceName', validateGatewayRequest, requireRole('ADMIN', 'DOCTOR'), getLogsByService);

// GET /api/audit/action/:action               — Logs for a specific event type
router.get('/action/:action', validateGatewayRequest, requireRole('ADMIN', 'DOCTOR'), getLogsByAction);

// GET /api/audit/:id                          — Single log by MongoDB ObjectId
router.get('/:id', validateGatewayRequest, requireRole('ADMIN', 'DOCTOR'), getLogById);

// DELETE /api/audit/:id                       — Delete log (admin only)
router.delete('/:id', validateGatewayRequest, requireRole('ADMIN'), deleteLog);

module.exports = router;
