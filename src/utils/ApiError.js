class ApiError extends Error {
  constructor(statusCode, message) {
    super(message); // Set the error message
    this.statusCode = statusCode; // Set the status code
    this.message = message || 'Something went wrong'; // Default message
    this.isOperational = true; // Helps in distinguishing operational errors
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;