const mongoose = require("mongoose");

async function connectDB() {
  try {
    // await mongoose.connect("mongodb://mongo:27017/chatapp"); // only works inside docker network
    await mongoose.connect("mongodb://localhost:27017/chatapp"); // for local (outside docker) dev
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

module.exports = connectDB;
