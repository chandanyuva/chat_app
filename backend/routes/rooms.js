const express = require("express");
const router = express.Router();
const Room = require("../models/Room");
const verifyToken = require("../middleware/authMiddleware");

// GET /rooms - Fetch all rooms (Protected or Public? Keeping public for listing, or protected based on requirement. Let's make it protected to be consistent with usage, but app loads it on login anyway)
// For now, let's keep it protected as per the pattern that only logged in users see chats
router.get("/", verifyToken, async (req, res) => {
  try {
    const rooms = await Room.find({});
    res.json(rooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

// POST /rooms - Create a new room (Protected)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Room name is required" });
    }

    // Owner is the current user
    const ownerId = req.user.userid;

    const newRoom = await Room.create({
      name,
      owner: ownerId,
      members: [ownerId] // Add creator as the first member
    });

    // Broadcast the new room to all connected clients
    req.io.emit("room_created", newRoom);

    res.status(201).json(newRoom);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create room" });
  }
});

module.exports = router;
