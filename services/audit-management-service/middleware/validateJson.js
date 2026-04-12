/**
 * JSON Validation Middleware
 * Intercepts malformed JSON body errors thrown by express.json()
 * and converts them to a clean 400 response instead of a 500.
 *
 * Register this IMMEDIATELY after express.json() in app.js.
 *
 * @param {SyntaxError} err
 */
const validateJson = (err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
    });
  }
  // Not a JSON parse error — pass through to the next error handler
  next(err);
};

module.exports = validateJson;
