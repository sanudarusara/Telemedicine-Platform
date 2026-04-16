const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const videoRoutes = require("./src/routes/videoRoutes");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5400", "http://localhost:3000", "http://localhost:5173", "http://localhost:8082"],
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Telemedicine Service is running");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "telemedicine-service",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/video", videoRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Telemedicine MongoDB connected");
    const PORT = process.env.PORT || 5007;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Telemedicine service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });