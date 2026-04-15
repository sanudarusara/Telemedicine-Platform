const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const videoRoutes = require("./src/routes/videoRoutes");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Telemedicine Service is running");
});

app.use("/api/video", videoRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Telemedicine MongoDB connected");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT,"0.0.0.0", () => {
      console.log(`Telemedicine service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });