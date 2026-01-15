import { useEffect, useState } from 'react'
import SideBar from "./components/Sidebar.jsx"
import ChatWindow from './components/ChatWindow.jsx';
import AuthForm from './components/AuthForm.jsx';
import CreateRoomModal from './components/CreateRoomModal.jsx';
import "./App.css"

import io from "socket.io-client";

const BACKEND_URL = "http://localhost:3000"
// const BACKEND_URL = "http://192.168.1.102:3000" // only for remote dev

function App() {

  // States
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomList, setRoomList] = useState([]);
  const [messages, setMessages] = useState({});
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [authMode, setAuthMode] = useState("login");

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
  //     setRoomList(data);
  //     setLoadingRooms(false);
  //     if (data.length > 0) setSelectedRoomId(data[0]._id);
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
          setRoomList(data);
          setLoadingRooms(false);
          if (data.length > 0) {
            setSelectedRoomId(data[0]._id);
          } else {
            setSelectedRoomId("");
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

  // Join rooms only after roomList is ready
  useEffect(() => {
    if (!socket || roomList.length === 0) return;

    roomList.forEach(room => {
      socket.emit("join_room", room._id);
    })
  }, [socket, roomList])

  // Messages
  useEffect(() => {
    // console.log(roomList);
    if (roomList.length > 0) {
      const initial_messages = {};
      roomList.forEach((room) => {
        initial_messages[room._id] = [];
      });
      setMessages(initial_messages);
    }
  }, [roomList])

  // Socket
  useEffect(() => {
    const newSocket = io(`${BACKEND_URL}`, {
      auth: { token }
    });
    // console.log(newSocket);
    setSocket(newSocket);
    // console.log("connected to socket");
    roomList.forEach((room) => {
      newSocket.emit("join_room", room._id);
      // console.log("joining room;", room._id);
    })
    newSocket.on("chat_message", ({ roomId, message, senderId, timestamp }) => {
      console.log("incomming :", timestamp, roomId, senderId, message);
      setMessages((prev) => {
        return {
          ...prev,
          [roomId]: [...(prev[roomId] || []), { message, senderId, timestamp }]
        }
      })
    })

    newSocket.on("room_created", (newRoom) => {
      console.log("New room created:", newRoom);
      setRoomList((prev) => [...prev, newRoom]);
    });

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
  }, [roomList]);

  // Helper Functions
  // selected Room Handler
  function onSelectRoomHandler(id) {
    // console.log(`clicked on ${id}`);
    setSelectedRoomId(id);
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

  // Create Room Handler
  async function handleCreateRoom(roomName, isPrivate) {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: roomName, isPrivate })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to create room");
      } else {
        // Automatically select the new room
        setSelectedRoomId(data._id);
        
        // If it's private, the socket won't broadcast it, so we must add it manually.
        // If it's public, the socket WILL broadcast it. 
        // To avoid duplicates for public rooms, we rely on the socket event for them, 
        // OR we add logic in the socket listener to prevent duplicates.
        // For now, let's only manually add if private.
        if (data.isPrivate) {
           setRoomList(prev => [...prev, data]);
        }
      }
    } catch (err) {
      console.error("Create Room Error:", err);
      alert("Error creating room");
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
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-tabs">
            <button
              className={`auth-tab ${authMode === "login" ? "active" : ""}`}
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button
              className={`auth-tab ${authMode === "signup" ? "active" : ""}`}
              onClick={() => setAuthMode("signup")}
            >
              Sign Up
            </button>
          </div>
          {authMode === "login" ? (
            <AuthForm mode="login" onSubmit={handleLogin} />
          ) : (
            <AuthForm mode="signup" onSubmit={handleSignup} />
          )}
        </div>
      </div>
    )
  } else {
    return (
      <div className="app-container">
        <div className="topbar">
          <div className="app-logo">Chat App</div>
          <div className="user-controls">
            <span>Hello, {user.username}</span>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </div>
        <div className="main-content">
          {loadingRooms ? <div>Loading...</div> : (
            <SideBar 
              roomList={roomList} 
              selectedRoomId={selectedRoomId} 
              onSelectRoom={onSelectRoomHandler} 
              onCreateRoom={() => setIsCreateRoomModalOpen(true)} 
            />
          )}
          {!selectedRoomId ? (
            <div className="welcome-screen">
              <h2>Welcome, {user.username}!</h2>
              <p>Create a new room to start chatting.</p>
            </div>
          ) : (
            !messages[selectedRoomId] ? (<div>Loading...</div>) : (
              <ChatWindow 
                socket={socket} 
                roomId={selectedRoomId} 
                room={roomList.find(r => r._id === selectedRoomId)}
                messages={messages} 
                setmessages={setMessages} 
                userId={user.userid} 
              />
            )
          )}
          <CreateRoomModal 
            isOpen={isCreateRoomModalOpen} 
            onClose={() => setIsCreateRoomModalOpen(false)} 
            onCreate={handleCreateRoom} 
          />
        </div>
      </div>
    )

  }
}

export default App
