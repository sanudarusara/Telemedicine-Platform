const mongoose = require('mongoose');

/**
 * Connect to the auth-management MongoDB database.
 * This service exclusively owns the users collection.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[db] Connected: ${conn.connection.host} / ${conn.connection.name}`);
  } catch (error) {
    console.error(`[db] Connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
