const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    match: /^[a-zA-Z0-9_]+$/
  },
  passwordHash: {
    type: String,
    required: true,
  },
  invitations: [{
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room"
    },
    inviterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  }]
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
