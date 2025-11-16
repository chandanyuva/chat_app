const mongoose = require("mongoose");

async function connectDB() {
  try {
    await mongoose.connect("mongodb://mongo:27017/chatapp");
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

module.exports = connectDB;
