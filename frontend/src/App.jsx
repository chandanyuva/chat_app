import { useEffect, useState } from 'react'
import SideBar from "./components/Sidebar.jsx"
import ChatWindow from './components/ChatWindow.jsx';
import AuthForm from './components/AuthForm.jsx';
import "./App.css"

import io from "socket.io-client";

// const BACKEND_URL = "http://localhost:3000"
const BACKEND_URL = "http://192.168.1.102:3000" // only for remote dev

function App() {

  // States
  const [selectedChatId, setSelectedChatId] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [chatList, setChatList] = useState([]);
  const [messages, setMessages] = useState({});
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");

  // Effects

  // Auto login on refresh
  useEffect(() => {
    async function checkLogin() {
      if (!token) return;
      try {
        const res = await fetch(`${BACKEND_URL}/auth/me`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error(err);
        setUser(null);
      }
    }
    checkLogin();
  }, [token]);

  // AUTO CONNECT SOCKET WHEN LOGGED IN
  useEffect(() => {
    if (!token) return;   // no token = not logged in

    const newSocket = io(BACKEND_URL, {
      auth: { token }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };

  }, [token]);

  // Rooms from db
  // useEffect(() => {
  //   fetch(`${BACKEND_URL}/rooms`).then(res => res.json()).then(data => {
  //     setChatList(data);
  //     setLoadingRooms(false);
  //     if (data.length > 0) setSelectedChatId(data[0]._id);
  //   })
  // }, [])

  // Rooms from db only after user login
  useEffect(() => {
    if (!user) return;

    async function loadRooms() {
      try {
        const res = await fetch(`${BACKEND_URL}/rooms`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await res.json();
        // console.log(data);
        if (res.ok) {
          setChatList(data);
          setLoadingRooms(false);
          if (data.length > 0) {
            setSelectedChatId(data[0]._id);
          } else {
            console.warn("Rooms list empty");
          }
        } else {
          console.error("Room Load Error:", data.error);
        }
      } catch (err) {
        console.error("Failed to fetch Rooms: ", err);
      }
    }
    loadRooms();
  }, [user]);

  // Join rooms only after chatList is ready
  useEffect(() => {
    if (!socket || chatList.length === 0) return;

    chatList.forEach(room => {
      socket.emit("join_room", room._id);
    })
  }, [socket, chatList])

  // Messages
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

  // Socket
  useEffect(() => {
    const newSocket = io(`${BACKEND_URL}`, {
      auth: { token }
    });
    // console.log(newSocket);
    setSocket(newSocket);
    // console.log("connected to socket");
    chatList.forEach((room) => {
      newSocket.emit("join_room", room._id);
      // console.log("joining room;", room._id);
    })
    newSocket.on("chat_message", ({ roomId, message, senderId, timestamp }) => {
      console.log("incomming :", timestamp, roomId, senderId, message);
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

  // Helper Functions
  // selected Chat Handler
  function onSelectChatHandler(id) {
    // console.log(`clicked on ${id}`);
    setSelectedChatId(id);
  };

  // SignUp Handler
  async function handleSignup({ email, username, password }) {
    const res = await fetch(`${BACKEND_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password })
    });
    // console.log(res);

    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("token", data.token);
    } else {
      alert(data.error);
    }
  }

  // Login Handler
  async function handleLogin({ email, password }) {
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("token", data.token);
    } else {
      alert(data.error);
    }
  }

  // LogOut Handler
  function handleLogout() {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);

    if (socket) {
      socket.disconnect();
    }
  }

  // console.log(user);
  if (!user) {
    return (
      <div>
        <AuthForm mode="login" onSubmit={handleLogin} />
        <AuthForm mode="signup" onSubmit={handleSignup} />
      </div>
    )
  } else {
    return (
      <div className="app-container">
        <div className="topbar">
          {/* <span>Hello, {user.username}</span> */}
          <button onClick={handleLogout}>Logout</button>
        </div>
        {loadingRooms ? <div>Loading...</div> : <SideBar chatList={chatList} selectedChatId={selectedChatId} onSelectChat={onSelectChatHandler} />}
        {setSelectedChatId && messages[setSelectedChatId] ? (<div>Loading...</div>) : (
          <ChatWindow socket={socket} chatId={selectedChatId} messages={messages} setmessages={setMessages} userId={user.userid} />
        )}
      </div>
    )

  }
}

export default App
