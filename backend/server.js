const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const ExpressApp = express();
const PORT = 3000;

const mainServer = http.createServer(ExpressApp);

ExpressApp.get("/", (req, res) => {
    res.send("Hello, world!")
})

const io = new Server(mainServer);

io.on("connection", (socket) => {
    console.log('a user connected');
    socket.on('chat_message', (msg) => {
        io.emit('chat_message', msg);
    });
    socket.on("disconnect", (msg) => {
        console.log("user disconnected");
    })
})

mainServer.listen(PORT, () => {
    console.log(`Server listening on PORT: ${PORT}`);
})