import { useEffect, useState } from 'react'
import SideBar from "./components/Sidebar.jsx"
import ChatWindow from './components/ChatWindow.jsx';
import "./App.css"

import io from "socket.io-client";



function App() {
  const [uid, setUid] = useState(null);
  useEffect(() => {
    let uid = localStorage.getItem("uid");
    if (!uid) {
      uid = "user_" + Math.random().toString(36).slice(2);
      localStorage.setItem("uid", uid);
    }
    setUid(uid);
  }, [])
  const [chatList, setChatList] = useState([
    { id: "room1", name: "Alice" },
    { id: "room2", name: "Bob" },
    { id: "room3", name: "Yuva" },
  ]);
  function makeId() {
    return crypto.randomUUID();
  }
  const [selectedChatId, setSelectedChatId] = useState("room1");
  const [messages, setMessages] = useState({
    room1: [],
    room2: [],
    room3: []
  });

  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io("http://localhost:3000/");
    console.log(newSocket);
    setSocket(newSocket);
    console.log("connected to socket");
    chatList.forEach((room) => {
      newSocket.emit("join_room", room.id);
      console.log("joining room;", room.id);
    })
    newSocket.on("chat_message", ({ roomId, message, senderId, timestamp }) => {
      console.log("incomming :", roomId, message, senderId, timestamp);
      setMessages((prev) => {
        return {
          ...prev,
          [roomId]: [...prev[roomId], { message, senderId, timestamp }]
        }
      })
    })
    newSocket.on("room_history", (history) => {
      if (history.length === 0) return;
      const roomId = history[0].roomId;

      // console.log("HISTORY RECEIVED:", history);

      setMessages((prev) => {
        return {
          ...prev,
          [roomId]: history
        }
      })
    })
    return () => {
      newSocket.disconnect();
    }
  }, [chatList]);

  function onSelectChatHandler(id) {
    console.log(`clicked on ${id}`);
    setSelectedChatId(id);
  };
  return (
    <div className="app-container">
      <SideBar chatList={chatList} selectedChatId={selectedChatId} onSelectChat={onSelectChatHandler} />
      <ChatWindow socket={socket} chatId={selectedChatId} messages={messages} setmessages={setMessages} uid={uid} />
    </div>
  )
}

export default App
