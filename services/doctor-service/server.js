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
const adminRoutes = require("./src/routes/admin_routes");
const slotApiRoutes = require("./src/routes/slot_api_routes");

const app = express();

// Log MongoDB URI
console.log("MongoDB URI:", process.env.MONGO_URI);

app.use(
  cors({
    origin: [
      "http://localhost:5400",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:8082",
    ],
    credentials: true,
  })
);

// Middleware setup
app.use(express.json());
app.use(sessionMiddleware);

// Global request logger
app.use((req, res, next) => {
  const start = Date.now();

  console.log("\n================ DOCTOR-SERVICE REQUEST START ================");
  console.log("Time:", new Date().toISOString());
  console.log("Method:", req.method);
  console.log("URL:", req.originalUrl);
  console.log("Params:", req.params || {});
  console.log("Query:", req.query || {});
  console.log("Body:", req.body || {});
  console.log("Has Authorization Header:", !!req.headers.authorization);
  console.log("Session User:", req.session?.userId || null);
  console.log("Session Role:", req.session?.role || null);

  res.on("finish", () => {
    console.log("---------------- DOCTOR-SERVICE REQUEST END ----------------");
    console.log("Method:", req.method);
    console.log("URL:", req.originalUrl);
    console.log("Status:", res.statusCode);
    console.log("Duration(ms):", Date.now() - start);
    console.log("============================================================\n");
  });

  next();
});

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
app.use("/api/doctors/admin", adminRoutes);
app.use("/api/doctors", slotApiRoutes); // service-to-service slot API (before protected routes)
app.use("/api/doctors", doctorRoutes);
app.use("/api/doctors", appointmentRoutes);
app.use("/api/doctors", prescriptionRoutes);

// 404 logger
app.use((req, res, next) => {
  console.error("404 Not Found:", req.method, req.originalUrl);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error logger
app.use((err, req, res, next) => {
  console.error("\n================ DOCTOR-SERVICE GLOBAL ERROR ================");
  console.error("Time:", new Date().toISOString());
  console.error("Method:", req.method);
  console.error("URL:", req.originalUrl);
  console.error("Params:", req.params || {});
  console.error("Query:", req.query || {});
  console.error("Body:", req.body || {});
  console.error("Message:", err.message);
  console.error("Stack:", err.stack);
  console.error("============================================================\n");

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

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