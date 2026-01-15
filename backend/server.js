const express = require('express');
const http = require('http');
require("dotenv").config(); // Load environment variables
const { Server } = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const morgan = require('morgan');
const logger = require('./utils/logger');
const connectDB = require("./db");
const Message = require("./models/Message.js");
const Room = require("./models/Room.js");

// Scheduled Task: Cleanup Trash (Rooms deleted > 3 days ago)
const TRASH_RETENTION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

async function cleanupTrash() {
  try {
    const thresholdDate = new Date(Date.now() - TRASH_RETENTION_MS);
    const result = await Room.deleteMany({
      deletedAt: { $ne: null, $lt: thresholdDate }
    });
    if (result.deletedCount > 0) {
      logger.info(`[Auto-Cleanup] Deleted ${result.deletedCount} expired rooms.`);
    }
  } catch (err) {
    logger.error("[Auto-Cleanup] Error:", err);
  }
}

// Run cleanup on startup and then every hour
cleanupTrash();
setInterval(cleanupTrash, 60 * 60 * 1000); 


const ExpressApp = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://frontend:5173",
  process.env.FRONTEND_URL || "http://localhost:5173",
];

connectDB();

const mainServer = http.createServer(ExpressApp);

const io = new Server(mainServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  }
});

ExpressApp.use(cors({
  origin: allowedOrigins,
}));
ExpressApp.use(express.json());

// Morgan HTTP Request Logging
const morganFormat = ':method :url :status :res[content-length] - :response-time ms';
ExpressApp.use(morgan(morganFormat, {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Attach io to request to be used in routes
ExpressApp.use((req, res, next) => {
  req.io = io;
  next();
});

ExpressApp.use("/auth", require("./routes/auth.js"));
ExpressApp.use("/rooms", require("./routes/rooms.js"));
ExpressApp.use("/invitations", require("./routes/invitations.js"));


io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("No token provided"));

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || "devsecret");
    socket.user = user;
    next();
  } catch (err) {
    return next(new Error("Invaild token"));
  }
})

io.on("connection", (socket) => {
  logger.info(`User connected: ${socket.user.username} (${socket.user.userid})`);
  
  // Join a personal room for direct notifications
  if (socket.user && socket.user.userid) {
    socket.join(socket.user.userid);
  }

  socket.on("join_room", async (roomId) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) {
        return socket.emit("error", "Room not found");
      }

      if (room.isPrivate) {
        const isMember = room.members.some(id => id.toString() === socket.user.userid);
        if (!isMember) {
          logger.warn(`Access denied for user ${socket.user.username} to room ${roomId}`);
          return socket.emit("error", "Access denied");
        }
      } else {
        // Public room: Auto-join (add to members)
        const isMember = room.members.some(id => id.toString() === socket.user.userid);
        if (!isMember) {
           room.members.push(socket.user.userid);
           await room.save();
           logger.debug(`User ${socket.user.username} auto-joined public room ${roomId}`);
        }
      }

      socket.join(roomId);
      logger.info(`User ${socket.user.username} joined room: ${roomId}`);

      const history = await Message.find({ roomId })
        .sort({ timestamp: -1 })
        .limit(50)
        .populate("senderId", "username"); // Populate username from User model
      history.reverse();
      
      socket.emit("room_history", history);
      logger.debug(`Sent history to ${socket.user.username} for room ${roomId}`);
    } catch (err) {
      logger.error("Join Room Error:", err);
    }
  })
  socket.on('chat_message', async ({ roomId, message, senderId }) => {
    const serverTime = Date.now();
    
    // Detailed debug log (hidden unless LOG_LEVEL=debug)
    logger.debug(`Incoming message from ${socket.user.username} in ${roomId}: ${message}`);

    await Message.create({
      roomId,
      message,
      senderId,
      timestamp: serverTime
    });
    io.to(roomId).emit('chat_message', {
      roomId,
      message,
      senderId: {
        _id: senderId,
        username: socket.user.username // Send username from socket session
      },
      timestamp: serverTime
    });
    
    // Concise info log
    logger.info(`Message sent in room ${roomId} by ${socket.user.username}`);
  });
  
  socket.on("disconnect", (reason) => {
    logger.info(`User disconnected: ${socket.user.username} (${reason})`);
  })
})

mainServer.listen(PORT, () => {
  logger.info(`Server listening on PORT: ${PORT}`);
})
