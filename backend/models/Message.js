const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  roomId: String,
  message: String,
  senderId: String,
  timestamp: Number
});

module.exports = mongoose.model("Message", MessageSchema);
