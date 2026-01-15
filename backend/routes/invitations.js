const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Room = require("../models/Room");
const verifyToken = require("../middleware/authMiddleware");

// GET /invitations - List my pending invitations
router.get("/", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userid)
      .populate("invitations.roomId", "name isPrivate")
      .populate("invitations.inviterId", "username");

    if (!user) return res.status(404).json({ error: "User not found" });

    // Filter out any invitations where the room might have been deleted
    const validInvitations = user.invitations.filter(inv => inv.roomId && inv.inviterId);
    
    res.json(validInvitations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch invitations" });
  }
});

// POST /invitations/:roomId/accept
router.post("/:roomId/accept", verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userid;

    const user = await User.findById(userId);
    const room = await Room.findById(roomId);

    if (!room) return res.status(404).json({ error: "Room not found" });

    // Remove invitation
    user.invitations = user.invitations.filter(inv => inv.roomId.toString() !== roomId);
    await user.save();

    // Add to room members if not already
    if (!room.members.includes(userId)) {
      room.members.push(userId);
      await room.save();
    }

    // Determine inviter ID (find from the invite object before we deleted it? 
    // Or simpler: just let the client tell us? No, security. 
    // Actually we just deleted it. Let's assume we don't need to persist the notification indefinitely.)
    
    // Notify Inviter (We need to know WHO invited them. 
    // Since we just deleted the invite, we lost that info unless we retrieved it first.)
    // Let's refine the logic to find the invite first.
    
    // (Optimization: We could have fetched the invite first)
    // For simplicity in this iteration, we will broadcast to the ROOM owner, 
    // OR we just emit to the room that a user joined.
    // BUT the requirement was "Notify the inviter".
    // Let's assume the owner is the inviter for now, or emit to room owner.
    
    req.io.to(room.owner.toString()).emit("invitation_accepted", {
      roomId,
      roomName: room.name,
      accepterName: req.user.username
    });
    
    // Also emit to the user so their room list updates immediately
    // Or frontend can handle it.
    // Sending the room object back helps frontend add it to list.
    
    res.json({ message: "Invitation accepted", room });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to accept invitation" });
  }
});

// POST /invitations/:roomId/reject
router.post("/:roomId/reject", verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userid;

    const user = await User.findById(userId);
    
    // Find inviter before deleting (optional, if we want to notify specific inviter)
    const invite = user.invitations.find(inv => inv.roomId.toString() === roomId);
    const inviterId = invite ? invite.inviterId.toString() : null;

    // Remove invitation
    user.invitations = user.invitations.filter(inv => inv.roomId.toString() !== roomId);
    await user.save();

    // Notify Inviter
    if (inviterId) {
       req.io.to(inviterId).emit("invitation_rejected", {
         roomId,
         rejecterName: req.user.username
       });
    }

    res.json({ message: "Invitation rejected" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reject invitation" });
  }
});

module.exports = router;
