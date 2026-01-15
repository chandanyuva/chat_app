const mongoose = require("mongoose");
const logger = require("./utils/logger");

async function connectDB() {
  try {
    // Use env variable or fallback to localhost
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/chatapp";
    await mongoose.connect(uri);
    logger.info("Connected to MongoDB");
  } catch (err) {
    logger.error("MongoDB connection error:", err);
  }
}

module.exports = connectDB;
