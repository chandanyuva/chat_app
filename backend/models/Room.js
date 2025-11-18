const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
  name: String
  // _id is auto-genarated by mongodb => this is used as roomId
});

module.exports = mongoose.model("Room", RoomSchema);
