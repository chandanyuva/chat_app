const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require("cors");

const connectDB = require("./db");
connectDB();

const ExpressApp = express();
const PORT = 3000;

ExpressApp.use(cors({
  origin: "http://localhost:5173",
}))

const mainServer = http.createServer(ExpressApp);

ExpressApp.get("/", (req, res) => {
  res.send("Hello, world!")
})

const io = new Server(mainServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  }
});

io.on("connection", (socket) => {
  console.log('a user connected');
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log("joined: ", roomId);
  })
  socket.on('chat_message', ({ roomId, message, senderId }) => {
    io.to(roomId).emit('chat_message', {
      roomId,
      message,
      senderId,
      timestamp: Date.now()
    });
    console.log("incomming: ", roomId, message, senderId);
  });
  socket.on("disconnect", (msg) => {
    console.log("user disconnected", msg);
  })
})

mainServer.listen(PORT, () => {
  console.log(`Server listening on PORT: ${PORT}`);
})
