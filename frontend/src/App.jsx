import { useEffect, useState, useRef } from 'react'
import SideBar from "./components/Sidebar.jsx"
import ChatWindow from './components/ChatWindow.jsx';
import AuthForm from './components/AuthForm.jsx';
import CreateRoomModal from './components/CreateRoomModal.jsx';
import InvitationListModal from './components/InvitationListModal.jsx';
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
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [authMode, setAuthMode] = useState("login");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Effects

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuRef]);

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
    
    // Load Invitations
    async function loadInvitations() {
      try {
        const res = await fetch(`${BACKEND_URL}/invitations`, {
           headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
           const data = await res.json();
           setInvitations(data);
        }
      } catch(err) {
         console.error("Failed to fetch invitations", err);
      }
    }
    loadInvitations();

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

    // Invitation Listeners
    newSocket.on("invitation_received", (invite) => {
      // console.log("Invitation Received:", invite);
      // We need to construct an object that matches the API response structure roughly
      // API returns populated objects. Socket sends ids/names.
      // We can just refetch or fake it. Faking it is faster for UI.
      
      const newInvite = {
        roomId: { _id: invite.roomId, name: invite.roomName },
        inviterId: { _id: invite.inviterId, username: invite.inviterName },
        _id: Date.now() // temp id
      };
      setInvitations(prev => [...prev, newInvite]);
      alert(`New invitation to join room: ${invite.roomName}`);
    });

    newSocket.on("invitation_accepted", (data) => {
       alert(`${data.accepterName} accepted your invitation to ${data.roomName}`);
    });

    newSocket.on("invitation_rejected", (data) => {
       alert(`${data.rejecterName} rejected your invitation to room ${data.roomId}`);
    });

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

  // Invitation Handlers
  async function handleAcceptInvite(roomId) {
     if (!token) return;
     try {
       const res = await fetch(`${BACKEND_URL}/invitations/${roomId}/accept`, {
         method: "POST",
         headers: { "Authorization": `Bearer ${token}` }
       });
       const data = await res.json();
       if (res.ok) {
          // Remove from local list
          setInvitations(prev => prev.filter(inv => inv.roomId._id !== roomId));
          // Add room to list
          setRoomList(prev => [...prev, data.room]);
          alert("Joined room successfully");
       } else {
         alert(data.error);
       }
     } catch(err) {
       console.error(err);
       alert("Error accepting invite");
     }
  }

  async function handleRejectInvite(roomId) {
    if (!token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/invitations/${roomId}/reject`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
         setInvitations(prev => prev.filter(inv => inv.roomId._id !== roomId));
      }
    } catch(err) {
      console.error(err);
      alert("Error rejecting invite");
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
            <div className="profile-menu-container" ref={profileMenuRef}>
              <div 
                className="profile-trigger" 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              >
                <span className="profile-name">{user.username}</span>
                {invitations.length > 0 && <span className="profile-badge-dot"></span>}
              </div>
              
              {isProfileMenuOpen && (
                <div className="profile-dropdown">
                  <div 
                    className="menu-item" 
                    onClick={() => {
                      setIsInvitationModalOpen(true);
                      setIsProfileMenuOpen(false);
                    }}
                  >
                    Invitations
                    {invitations.length > 0 && <span className="menu-badge">{invitations.length}</span>}
                  </div>
                  <div className="menu-item logout" onClick={handleLogout}>
                    Logout
                  </div>
                </div>
              )}
            </div>
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
          <InvitationListModal 
             isOpen={isInvitationModalOpen}
             onClose={() => setIsInvitationModalOpen(false)}
             invitations={invitations}
             onAccept={handleAcceptInvite}
             onReject={handleRejectInvite}
          />
        </div>
      </div>
    )

  }
}

export default App
