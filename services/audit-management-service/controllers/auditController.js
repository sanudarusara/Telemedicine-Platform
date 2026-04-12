const AuditLog = require('../models/AuditLog');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parses and validates pagination / sorting query params.
 * Caps limit at 100 to prevent excessive data pulls.
 */
const parsePagination = (query) => {
  const page      = Math.max(1, parseInt(query.page  || '1',  10));
  const limit     = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
  const sortBy    = query.sortBy    || 'timestamp';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  return { page, limit, sortBy, sortOrder };
};

/**
 * Runs a paginated find query and returns a uniform response envelope.
 */
const paginatedResponse = async (res, filter, { page, limit, sortBy, sortOrder }) => {
  const [data, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return res.json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/audit
 * Returns all audit logs with pagination and sorting.
 * Query params: page, limit, sortBy, sortOrder
 */
const getAllLogs = async (req, res, next) => {
  try {
    await paginatedResponse(res, {}, parsePagination(req.query));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/audit/:id
 * Returns a single audit log by MongoDB ObjectId.
 */
const getLogById = async (req, res, next) => {
  try {
    const log = await AuditLog.findById(req.params.id).lean();
    if (!log) {
      return res.status(404).json({ success: false, message: 'Audit log not found' });
    }
    res.json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/audit/user/:userId
 * Returns paginated logs for a specific user.
 */
const getLogsByUser = async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query);
    await paginatedResponse(res, { userId: req.params.userId }, pagination);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/audit/service/:serviceName
 * Returns paginated logs for a specific originating service.
 */
const getLogsByService = async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query);
    await paginatedResponse(res, { serviceName: req.params.serviceName }, pagination);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/audit/action/:action
 * Returns paginated logs filtered by action / event type.
 */
const getLogsByAction = async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query);
    await paginatedResponse(res, { action: req.params.action }, pagination);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/audit/date-range?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Returns logs that fall within the inclusive date range.
 */
const getLogsByDateRange = async (req, res, next) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: 'Both "start" and "end" query parameters are required',
      });
    }

    const startDate = new Date(start);
    const endDate   = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD.',
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: '"start" date must be before or equal to "end" date',
      });
    }

    // Include the full last day
    endDate.setHours(23, 59, 59, 999);

    const filter    = { timestamp: { $gte: startDate, $lte: endDate } };
    const pagination = parsePagination(req.query);
    await paginatedResponse(res, filter, pagination);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/audit/:id
 * Permanently deletes an audit log by ID.
 * Protected by the requireAdmin middleware.
 */
const deleteLog = async (req, res, next) => {
  try {
    const log = await AuditLog.findByIdAndDelete(req.params.id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Audit log not found' });
    }
    res.json({
      success: true,
      message: 'Audit log deleted successfully',
      data: { id: req.params.id },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllLogs,
  getLogById,
  getLogsByUser,
  getLogsByService,
  getLogsByAction,
  getLogsByDateRange,
  deleteLog,
};
