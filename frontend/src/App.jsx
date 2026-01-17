import { useEffect, useState, useRef } from 'react'
import SideBar from "./components/Sidebar.jsx"
import ChatWindow from './components/ChatWindow.jsx';
import AuthForm from './components/AuthForm.jsx';
import CreateRoomModal from './components/CreateRoomModal.jsx';
import InvitationListModal from './components/InvitationListModal.jsx';
import TrashBinModal from './components/TrashBinModal.jsx';
import logger from './utils/logger';
import "./App.css"

import io from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

function App() {

  // States
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomList, setRoomList] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [messages, setMessages] = useState({});
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);
  const [isTrashBinModalOpen, setIsTrashBinModalOpen] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [trashRooms, setTrashRooms] = useState([]);
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [authMode, setAuthMode] = useState("login");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const selectedRoomIdRef = useRef(selectedRoomId);

  // Effects

  // Keep ref in sync
  useEffect(() => {
    selectedRoomIdRef.current = selectedRoomId;
  }, [selectedRoomId]);

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
        logger.error(err);
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
    
    // Debug listener for all events
    newSocket.onAny((eventName, ...args) => {
      logger.debug(`[Socket Incoming] ${eventName}`, args);
    });

    return () => {
      newSocket.disconnect();
    };

  }, [token]);

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
        // logger.debug("Rooms loaded:", data);
        if (res.ok) {
          setRoomList(data);
          setLoadingRooms(false);

          // Initialize unread counts from the response
          const initialCounts = {};
          data.forEach(room => {
            if (room.unreadCount > 0) {
              initialCounts[room._id] = room.unreadCount;
            }
          });
          setUnreadCounts(initialCounts);

          // Default to NO room selected (Show Welcome Screen)
          setSelectedRoomId("");
          
        } else {
          logger.error("Room Load Error:", data.error);
        }
      } catch (err) {
        logger.error("Failed to fetch Rooms: ", err);
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
         logger.error("Failed to fetch invitations", err);
      }
    }
    loadInvitations();

    // Load Trash
    async function loadTrash() {
      try {
        const res = await fetch(`${BACKEND_URL}/rooms/trash`, {
           headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
           const data = await res.json();
           setTrashRooms(data);
        }
      } catch(err) {
         logger.error("Failed to fetch trash", err);
      }
    }
    loadTrash();

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
    // logger.debug(roomList);
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
    // logger.debug(newSocket);
    setSocket(newSocket);
    // logger.info("connected to socket");
    roomList.forEach((room) => {
      newSocket.emit("join_room", room._id);
      // logger.debug("joining room;", room._id);
    })
    
    // Debug listener for all events
    newSocket.onAny((eventName, ...args) => {
      logger.debug(`[Socket Incoming] ${eventName}`, args);
    });
    
    newSocket.on("chat_message", ({ roomId, message, senderId, timestamp }) => {
      logger.info("Incoming Message:", timestamp, roomId, senderId, message);
      
      // If we are NOT in the room where the message came from, increment unread count
      if (selectedRoomIdRef.current !== roomId) {
        setUnreadCounts((prev) => ({
          ...prev,
          [roomId]: (prev[roomId] || 0) + 1
        }));
      }

      setMessages((prev) => {
        return {
          ...prev,
          [roomId]: [...(prev[roomId] || []), { message, senderId, timestamp }]
        }
      })
    })

    // Invitation Listeners
    newSocket.on("invitation_received", (invite) => {
      // logger.info("Invitation Received:", invite);
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
      logger.info("New room created:", newRoom);
      // We might get this event even if we restored a room.
      // Ensure we don't add duplicates if it's already there (though backend usually handles this)
      setRoomList((prev) => {
        if (prev.some(r => r._id === newRoom._id)) return prev;
        return [...prev, newRoom];
      });
    });

    newSocket.on("room_deleted", ({ roomId }) => {
       // Check if we are currently in this room
       if (selectedRoomIdRef.current === roomId) {
          // If I am NOT the one who initiated the delete (we can infer this if it happens unexpectedly)
          // Ideally we check if we are the owner, but roomList might be stale in this closure without ref.
          // Let's just notify generically if it was selected.
          // Or better: The backend could send "deletedBy".
          // For now, simpler: If it disappears while viewing, notify.
          // However, if *I* deleted it, I know.
          // Alerting myself is annoying.
          // We can check if 'user' state is owner. 'user' is in dependency array? No.
          // Let's just reset selection.
          setSelectedRoomId("");
          alert("This room has been deleted.");
       }

       // Remove from active list for everyone
       setRoomList(prev => prev.filter(r => r._id !== roomId));
    });

    newSocket.on("room_history", (history) => {
      if (history.length === 0) return;
      const roomId = history[0].roomId;

      // logger.debug("HISTORY RECEIVED:", history);

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
    // logger.debug(`clicked on ${id}`);
    setSelectedRoomId(id);
    
    // Reset local unread count
    setUnreadCounts((prev) => ({
      ...prev,
      [id]: 0
    }));

    // Mark as read in backend
    if (token) {
      fetch(`${BACKEND_URL}/rooms/${id}/read`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      }).catch(err => logger.error("Failed to mark room as read", err));
    }
  };

  // SignUp Handler
  async function handleSignup({ email, username, password }) {
    const res = await fetch(`${BACKEND_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password })
    });
    // logger.debug(res);

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
      logger.error("Create Room Error:", err);
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
       logger.error(err);
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
      logger.error(err);
      alert("Error rejecting invite");
    }
  }


  // Trash Handlers
  async function handleDeleteRoom(roomId) {
    if (!confirm("Are you sure you want to delete this room? It will be moved to the trash for 3 days.")) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/rooms/${roomId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        // Optimistic UI update
        const room = roomList.find(r => r._id === roomId);
        if (room) {
           setTrashRooms(prev => [...prev, room]);
        }
        // Room removal from list is handled by socket "room_deleted"
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch(err) {
      logger.error(err);
      alert("Error deleting room");
    }
  }

  async function handleRestoreRoom(roomId) {
    try {
      const res = await fetch(`${BACKEND_URL}/rooms/${roomId}/restore`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setTrashRooms(prev => prev.filter(r => r._id !== roomId));
        // Room addition to list is handled by socket "room_created"
        alert("Room restored!");
      }
    } catch(err) {
      logger.error(err);
      alert("Error restoring room");
    }
  }

  async function handleDeletePermanent(roomId) {
    if (!confirm("This action cannot be undone. Delete forever?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/rooms/${roomId}/permanent`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setTrashRooms(prev => prev.filter(r => r._id !== roomId));
      }
    } catch(err) {
      logger.error(err);
      alert("Error deleting permanently");
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

  // logger.debug(user);
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
                  <div 
                    className="menu-item" 
                    onClick={() => {
                      setIsTrashBinModalOpen(true);
                      setIsProfileMenuOpen(false);
                    }}
                  >
                    Trash Bin
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
              unreadCounts={unreadCounts} 
            />
          )}
          {!selectedRoomId ? (
            <div className="welcome-screen">
              <h2>Welcome, {user.username}!</h2>
              <p>Select a room to view messages or create a new one.</p>
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
                onDelete={handleDeleteRoom}
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
          <TrashBinModal 
             isOpen={isTrashBinModalOpen}
             onClose={() => setIsTrashBinModalOpen(false)}
             trashRooms={trashRooms}
             onRestore={handleRestoreRoom}
             onDeletePermanent={handleDeletePermanent}
          />
        </div>
      </div>
    )

  }
}

export default App
