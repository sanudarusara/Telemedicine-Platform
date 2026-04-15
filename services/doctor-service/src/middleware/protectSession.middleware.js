function protectSession(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Attach session data to the request object
  req.userId = req.session.userId;
  req.role = req.session.role;

  next(); // Proceed to the next middleware/route handler
}

module.exports = { protectSession };