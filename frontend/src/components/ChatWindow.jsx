import { useState, useEffect, useRef } from "react";

function ChatWindow({ socket, chatId, messages, setMessages, userId }) {
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages[chatId]]);
  function handleSend() {
    if (!text.trim()) return; // prevent empty or whitespace-only messages
    socket.emit("chat_message", {
      roomId: chatId,
      message: text,
      senderId: userId,
    })
    setText("");
  }

  function formatTime(time) {
    const date = new Date(time);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }


  const bottomRef = useRef(null);
  const [text, setText] = useState("")
  return <div className="chatwindow">
    <div className="messages-area">
      {messages[chatId] ? (messages[chatId].map(({ message, senderId, timestamp }, index) => {
        {/* console.log(message, senderId, timestamp); */ }
        const isMe = senderId === userId;
        return (<div
          key={index}
          className={`message-bubble ${isMe ? "outgoing" : "incoming"}`}
        >
          <div>{message}</div>
          <div className="timestamp">{formatTime(timestamp)}</div>
        </div>)
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
  </div >
}
export default ChatWindow;
