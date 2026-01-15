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
      $and: [
        { deletedAt: null },
        {
          $or: [
            { isPrivate: false },
            { members: userId }
          ]
        }
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

    // Check if already invited
    const alreadyInvited = userToInvite.invitations.some(
      inv => inv.roomId.toString() === roomId
    );

    if (alreadyInvited) {
       return res.status(400).json({ error: "User has already been invited" });
    }

    // Add invitation
    userToInvite.invitations.push({
      roomId: room._id,
      inviterId: req.user.userid
    });
    await userToInvite.save();

    // Notify the user via socket
    req.io.to(userToInvite._id.toString()).emit("invitation_received", {
      roomId: room._id,
      roomName: room.name,
      inviterId: req.user.userid,
      inviterName: req.user.username // Assuming username is available in token or we fetch it. 
      // req.user usually comes from token which has username. Let's verify middleware.
    });

    res.json({ message: "Invitation sent successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to invite user" });
  }
});

module.exports = router;

// GET /rooms/trash - Fetch deleted rooms for the owner
router.get("/trash", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userid;
    const rooms = await Room.find({
      owner: userId,
      deletedAt: { $ne: null }
    });
    res.json(rooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch trash" });
  }
});

// DELETE /rooms/:roomId - Soft delete a room
router.delete("/:roomId", verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);

    if (!room) return res.status(404).json({ error: "Room not found" });

    if (room.owner.toString() !== req.user.userid) {
      return res.status(403).json({ error: "Only the owner can delete the room" });
    }

    room.deletedAt = new Date();
    await room.save();

    req.io.emit("room_deleted", { roomId }); // Notify everyone to remove from list

    res.json({ message: "Room moved to trash" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete room" });
  }
});

// POST /rooms/:roomId/restore - Restore a deleted room
router.post("/:roomId/restore", verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);

    if (!room) return res.status(404).json({ error: "Room not found" });

    if (room.owner.toString() !== req.user.userid) {
      return res.status(403).json({ error: "Only the owner can restore the room" });
    }

    room.deletedAt = null;
    await room.save();

    // Notify relevant users (Public or Members) that room is back
    // Simplest approach: Just emit 'room_created' effectively re-adding it
    req.io.emit("room_created", room);

    res.json({ message: "Room restored" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to restore room" });
  }
});

// DELETE /rooms/:roomId/permanent - Permanently delete a room
router.delete("/:roomId/permanent", verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findById(roomId);

    if (!room) return res.status(404).json({ error: "Room not found" });

    if (room.owner.toString() !== req.user.userid) {
      return res.status(403).json({ error: "Only the owner can delete the room" });
    }

    await Room.deleteOne({ _id: roomId });

    res.json({ message: "Room deleted permanently" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete room permanently" });
  }
});
