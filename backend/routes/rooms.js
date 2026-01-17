const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const Room = require("../models/Room");
const User = require("../models/User");
const verifyToken = require("../middleware/authMiddleware");
const logger = require("../utils/logger");

// GET /rooms - Fetch all rooms with unread counts (Protected)
router.get("/", verifyToken, async (req, res) => {
  try {
    // Current user ID
    const userId = new mongoose.Types.ObjectId(req.user.userid);

    // Fetch the user to get their lastRead map
    // We need this map to compare against message timestamps
    const userDoc = await User.findById(userId).select("lastRead");
    const lastReadMap = userDoc ? userDoc.lastRead : new Map();

    const rooms = await Room.aggregate([
      // 1. Match rooms: Not deleted AND (Public OR Member)
      {
        $match: {
          deletedAt: null,
          $or: [
            { isPrivate: false },
            { members: userId }
          ]
        }
      },
      // 2. Lookup Messages to count unread
      {
        $lookup: {
          from: "messages",
          let: {
            roomIdStr: { $toString: "$_id" } // Message.roomId is a String
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$roomId", "$$roomIdStr"]
                }
              }
            },
            // We only need timestamps for counting
            { $project: { timestamp: 1 } }
          ],
          as: "messages"
        }
      },
      // 3. Project / Calculate Unread
      {
        $project: {
          name: 1,
          isPrivate: 1,
          owner: 1,
          members: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    ]);

    // OPTIMIZATION: 2nd Query to get message counts
    // We iterate and run `countDocuments` concurrently.
    const roomsWithCounts = await Promise.all(rooms.map(async (room) => {
      const roomId = room._id.toString();
      const lastRead = lastReadMap.get(roomId) || new Date(0); // Default to epoch

      const count = await mongoose.model("Message").countDocuments({
        roomId: roomId,
        timestamp: { $gt: lastRead }
      });

      return {
        ...room, // room is a POJO from aggregation
        unreadCount: count
      };
    }));

    res.json(roomsWithCounts);

  } catch (err) {
    logger.error("Fetch Rooms Error:", err);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

// POST /rooms/:roomId/read - Mark room as read
router.post("/:roomId/read", verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userid;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Update the Map
    // Ensure lastRead is initialized (if migrating old users)
    if (!user.lastRead) {
      user.lastRead = new Map();
    }

    user.lastRead.set(roomId, new Date());
    await user.save();

    res.json({ success: true });
  } catch (err) {
    logger.error("Mark Read Error:", err);
    res.status(500).json({ error: "Failed to mark room as read" });
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

    logger.info(`Room created: ${name} (Private: ${isPrivate}) by ${req.user.username}`);

    // Broadcast the new room to all connected clients ONLY if it is Public
    if (!newRoom.isPrivate) {
      req.io.emit("room_created", newRoom);
    }

    res.status(201).json(newRoom);
  } catch (err) {
    logger.error("Create Room Error:", err);
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

    logger.info(`User ${req.user.username} invited ${username} to room ${room.name}`);

    // Notify the user via socket
    req.io.to(userToInvite._id.toString()).emit("invitation_received", {
      roomId: room._id,
      roomName: room.name,
      inviterId: req.user.userid,
      inviterName: req.user.username
    });

    res.json({ message: "Invitation sent successfully" });

  } catch (err) {
    logger.error("Invite User Error:", err);
    res.status(500).json({ error: "Failed to invite user" });
  }
});


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
    logger.error("Fetch Trash Error:", err);
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

    logger.info(`Room soft-deleted: ${room.name} by ${req.user.username}`);

    req.io.emit("room_deleted", { roomId }); // Notify everyone to remove from list

    res.json({ message: "Room moved to trash" });
  } catch (err) {
    logger.error("Delete Room Error:", err);
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

    logger.info(`Room restored: ${room.name} by ${req.user.username}`);

    // Notify relevant users (Public or Members) that room is back
    // Simplest approach: Just emit 'room_created' effectively re-adding it
    req.io.emit("room_created", room);

    res.json({ message: "Room restored" });
  } catch (err) {
    logger.error("Restore Room Error:", err);
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

    logger.info(`Room permanently deleted: ${room.name} by ${req.user.username}`);

    res.json({ message: "Room deleted permanently" });
  } catch (err) {
    logger.error("Permanent Delete Error:", err);
    res.status(500).json({ error: "Failed to delete room permanently" });
  }
});
module.exports = router;
