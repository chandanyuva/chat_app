const express = require("express");
const router = express.Router();
const Room = require("../models/Room");
const User = require("../models/User");
const verifyToken = require("../middleware/authMiddleware");

// GET /rooms - Fetch all rooms (Protected)
// Return all Public rooms OR Private rooms where the user is a member
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userid;
    const rooms = await Room.find({
      $or: [
        { isPrivate: false },
        { members: userId }
      ]
    });
    res.json(rooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

// POST /rooms - Create a new room (Protected)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { name, isPrivate } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Room name is required" });
    }

    // Owner is the current user
    const ownerId = req.user.userid;

    const newRoom = await Room.create({
      name,
      isPrivate: !!isPrivate, // Ensure boolean
      owner: ownerId,
      members: [ownerId] // Add creator as the first member
    });

    // Broadcast the new room to all connected clients ONLY if it is Public
    if (!newRoom.isPrivate) {
      req.io.emit("room_created", newRoom);
    }

    res.status(201).json(newRoom);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create room" });
  }
});


// POST /rooms/:roomId/invite - Invite a user to a private room
router.post("/:roomId/invite", verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    // Check ownership
    if (room.owner.toString() !== req.user.userid) {
      return res.status(403).json({ error: "Only the room owner can invite users" });
    }

    // Find the user to invite
    const userToInvite = await User.findOne({ username });
    if (!userToInvite) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already a member
    if (room.members.includes(userToInvite._id)) {
      return res.status(400).json({ error: "User is already a member" });
    }

    room.members.push(userToInvite._id);
    await room.save();

    res.json({ message: "User invited successfully", room });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to invite user" });
  }
});

module.exports = router;
