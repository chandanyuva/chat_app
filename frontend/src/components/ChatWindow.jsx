import { useState, useEffect, useRef } from "react";
import InviteUserModal from "./InviteUserModal";
import logger from "../utils/logger";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

function ChatWindow({ socket, roomId, room, messages, setMessages, userId, onDelete }) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages[roomId]]);
  function handleSend() {
    if (!text.trim()) return; // prevent empty or whitespace-only messages
    socket.emit("chat_message", {
      roomId: roomId,
      message: text,
      senderId: userId,
    })
    setText("");
  }

  function formatTime(time) {
    const date = new Date(time);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  async function handleInvite(username) {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${BACKEND_URL}/rooms/${roomId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      if (res.ok) {
        alert("User invited successfully!");
      } else {
        alert(data.error || "Failed to invite");
      }
    } catch (err) {
      logger.error(err);
      alert("Error inviting user");
    }
  }


  const bottomRef = useRef(null);
  const [text, setText] = useState("")
  const isOwner = room?.owner === userId;

  return <div className="chatwindow">
    <div className="chat-header">
      <div className="chat-title">
        {room?.name}
        {room?.isPrivate && <span className="badge-private">Private</span>}
      </div>
      <div className="chat-actions">
        {isOwner && room?.isPrivate && (
          <button className="invite-btn" onClick={() => setIsInviteModalOpen(true)}>
            + Invite
          </button>
        )}
        {isOwner && (
          <button 
            className="delete-room-btn" 
            title="Delete Room"
            onClick={() => onDelete(roomId)}
          >
            🗑️
          </button>
        )}
      </div>
    </div>
    <div className="messages-area">
      {messages[roomId] ? (messages[roomId].map(({ message, senderId, timestamp }, index) => {
        const senderIdStr = typeof senderId === 'object' ? senderId?._id : senderId;
        const isMe = senderIdStr === userId;
        const senderName = typeof senderId === 'object' ? senderId?.username : "Unknown";

        return (
          <div key={index} className="message-wrapper">
            {!isMe && <div className="sender-name">{senderName}</div>}
            <div
              className={`message-bubble ${isMe ? "outgoing" : "incoming"}`}
            >
              <div>{message}</div>
              <div className="timestamp">{formatTime(timestamp)}</div>
            </div>
          </div>
        )
      })) : (<div>Loading...</div>)}
      <div ref={bottomRef}></div>
    </div>
    <div className="input-area">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSend();
          }
        }
        }
      />
      < button onClick={handleSend} > Send</button>
    </div>
    <InviteUserModal
      isOpen={isInviteModalOpen}
      onClose={() => setIsInviteModalOpen(false)}
      onInvite={handleInvite}
    />
  </div >
}
export default ChatWindow;
