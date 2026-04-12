/**
 * Global Error Handler Middleware
 * Must be registered LAST in the Express middleware chain.
 * Handles Mongoose errors, JSON parse errors, and generic server errors.
 *
 * @param {Error} err
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(`[ErrorHandler] ${err.message}`, { stack: err.stack });

  // Mongoose CastError — invalid ObjectId supplied to findById / findByIdAndDelete
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({ success: false, message: 'Invalid ID format' });
  }

  // Mongoose ValidationError — schema constraint violated
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors: messages });
  }

  // Mongoose duplicate-key error
  if (err.code === 11000) {
    return res.status(409).json({ success: false, message: 'Duplicate key error', details: err.keyValue });
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // Expose stack trace only in development to avoid leaking internals
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
