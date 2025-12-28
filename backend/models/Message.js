const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  roomId: String,
  message: String,
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  timestamp: Number
});

module.exports = mongoose.model("Message", MessageSchema);
