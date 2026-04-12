/**
 * Request Logger Middleware
 * Logs every HTTP request with method, URL, status code, and response time.
 * Attaches a listener to the response 'finish' event so the status code is
 * available after the handler has run.
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const ip         = req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '-';
    console.log(
      `[HTTP] ${req.method} ${req.originalUrl} → ${res.statusCode} | ${durationMs}ms | IP: ${ip}`
    );
  });

  next();
};

module.exports = requestLogger;
