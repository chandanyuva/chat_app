import { useEffect, useState } from 'react'
import SideBar from "./components/Sidebar.jsx"

function App() {

  const [chatList, setChatList] = useState([
    { id: "room1", name: "Alice" },
    { id: "room2", name: "Bob" },
    { id: "room3", name: "Yuva" },
  ]);
  const [selectedChatId, setSelectedChatId] = useState("room1");
  const [messages, setMessages] = useState({
    room1: [],
    room2: [],
    room3: []
  });
  function onSelectChatHandler(id) {
    console.log(`clicked on ${id}`);
    setSelectedChatId(id);
  };
  // useEffect(() => {
  //   const [socket, setSocket] = useEffect();
  // }, [])
  return (
    <div>
      <SideBar chatList={chatList} selectedChatId={selectedChatId} onSelectChat={onSelectChatHandler} />
      <div>{selectedChatId}</div>
    </div>
  )
}

export default App
