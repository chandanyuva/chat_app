const mongoose = require("mongoose");

async function connectDB() {
  try {
    // Use env variable or fallback to localhost
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017/chatapp";
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

module.exports = connectDB;
