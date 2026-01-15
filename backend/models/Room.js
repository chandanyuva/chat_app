const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
  name: String,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  deletedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model("Room", RoomSchema);
