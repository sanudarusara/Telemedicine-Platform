// auth_routes.js
const express = require("express");
const { registerDoctor, loginDoctor, logoutDoctor } = require("../controllers/auth_controller");

const router = express.Router();

// Doctor registration route
router.post("/register", async (req, res, next) => {
  try {
    console.log("Registering doctor:", req.body);  // Log incoming data
    await registerDoctor(req, res);  // Call controller function to register the doctor
  } catch (err) {
    console.error("Error in register route:", err);  // Log error if it occurs
    next(err); // Pass the error to the global error handler
  }
});

// Doctor login route
router.post("/login", async (req, res, next) => {
  try {
    console.log("Doctor login attempt:", req.body);  // Log incoming login data
    await loginDoctor(req, res);  // Call controller function to login the doctor
  } catch (err) {
    console.error("Error in login route:", err);  // Log error if it occurs
    next(err); // Pass the error to the global error handler
  }
});

// Doctor logout route (no need for async handler)
router.post("/logout", logoutDoctor);

module.exports = router;