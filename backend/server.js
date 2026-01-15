const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const connectDB = require("./db");
const Message = require("./models/Message.js");
const Room = require("./models/Room.js");


const ExpressApp = express();
const PORT = 3000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://frontend:5173",
  // "http://192.168.1.102:5173" // only for remote dev
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

// Attach io to request to be used in routes
ExpressApp.use((req, res, next) => {
  req.io = io;
  next();
});

ExpressApp.use("/auth", require("./routes/auth.js"));
ExpressApp.use("/rooms", require("./routes/rooms.js"));
ExpressApp.use("/invitations", require("./routes/invitations.js"));

// Routes removed


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
  console.log('a user connected');
  
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
          return socket.emit("error", "Access denied");
        }
      } else {
        // Public room: Auto-join (add to members)
        const isMember = room.members.some(id => id.toString() === socket.user.userid);
        if (!isMember) {
           room.members.push(socket.user.userid);
           await room.save();
        }
      }

      socket.join(roomId);
      console.log("joined: ", roomId);

      const history = await Message.find({ roomId })
        .sort({ timestamp: -1 })
        .limit(50)
        .populate("senderId", "username"); // Populate username from User model
      history.reverse();
      // console.log(history);
      socket.emit("room_history", history);
      // console.log(roomId, ": RoomHistroy fetched")
    } catch (err) {
      console.error("Join Room Error:", err);
    }
  })
  socket.on('chat_message', async ({ roomId, message, senderId }) => {
    const serverTime = Date.now();
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
    console.log("incomming: ", serverTime, roomId, senderId, message);
  });
  socket.on("disconnect", (msg) => {
    console.log("user disconnected", msg);
  })
})

mainServer.listen(PORT, () => {
  console.log(`Server listening on PORT: ${PORT}`);
})
