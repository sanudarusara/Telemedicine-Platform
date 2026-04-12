const mongoose = require('mongoose');

/**
 * Establishes a connection to MongoDB using the MONGO_URI env variable.
 * Exits the process if the connection fails — a microservice cannot run
 * without its database.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[db] MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[db] MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
