const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Import middlewares
const sessionMiddleware = require("./src/middleware/session_middleware");

// Import routes
const authRoutes = require("./src/routes/auth_routes");
const doctorRoutes = require("./src/routes/doctor_routes");
const appointmentRoutes = require("./src/routes/appointment_routes");
const prescriptionRoutes = require("./src/routes/prescription_routes");

const app = express();

// Log MongoDB URI
console.log("MongoDB URI:", process.env.MONGO_URI);

// CORS setup
app.use(
  cors({
    origin: ["http://localhost:5400", "http://localhost:3000", "http://localhost:5173", "http://localhost:8082"],
    credentials: true,
  })
);

// Middleware setup
app.use(express.json());
app.use(sessionMiddleware);

// Health
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "doctor-service",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/doctors", appointmentRoutes);
app.use("/api/doctors", prescriptionRoutes);

// Database connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Start the server
const PORT = process.env.PORT || 5006;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});