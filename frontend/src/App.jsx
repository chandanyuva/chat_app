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
  const [selectedChatId, setSelectedChatId] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [chatList, setChatList] = useState([]);
  useEffect(() => {
    fetch("http://localhost:3000/rooms").then(res => res.json()).then(data => {
      setChatList(data);
      setLoadingRooms(false);
      if (data.length > 0) setSelectedChatId(data[0]._id);
    })
  }, [])
  function makeId() {
    return crypto.randomUUID();
  }
  const [messages, setMessages] = useState({});
  useEffect(() => {
    // console.log(chatList);
    if (chatList.length > 0) {
      const initial_messages = {};
      chatList.forEach((room) => {
        initial_messages[room._id] = [];
      });
      setMessages(initial_messages);
    }
  }, [chatList])

  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io("http://localhost:3000/");
    // console.log(newSocket);
    setSocket(newSocket);
    // console.log("connected to socket");
    chatList.forEach((room) => {
      newSocket.emit("join_room", room._id);
      // console.log("joining room;", room._id);
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
      {loadingRooms ? <div>Loading...</div> : <SideBar chatList={chatList} selectedChatId={selectedChatId} onSelectChat={onSelectChatHandler} />}
      {setSelectedChatId && messages[setSelectedChatId] ? (<div>Loading...</div>) : (
        <ChatWindow socket={socket} chatId={selectedChatId} messages={messages} setmessages={setMessages} uid={uid} />
      )}
    </div>
  )
}

export default App
