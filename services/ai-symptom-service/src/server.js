const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");
const symptomRoutes = require("./routes/symptomRoutes");

const app = express();

// DB
connectDB();

// Middleware
app.use(cors({
  origin: ["http://localhost:8082"],
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/symptoms", symptomRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ai-symptom-service", timestamp: new Date().toISOString() });
});

// Test route
app.get("/", (req, res) => {
  res.send("AI Symptom Service running");
});

// Server start
const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  console.log(`AI Symptom Service running on port ${PORT}`);
});