
import SidebarItem from "./SidebarItem";


function Sidebar({ chatList, selectedChatId, onSelectChat, onCreateRoom }) {
  // console.log("chatList in Sidebar:", chatList);
  return <div className="sidebar">
    <div style={{ flex: 1, overflowY: "auto" }}>
      {(!chatList || chatList.length === 0) ? <div>No Rooms Found.</div> : (
        chatList.map((room) => {
          return <SidebarItem key={room._id} id={room["_id"]} name={room["name"]} isSelected={room._id === selectedChatId} onSelectChat={onSelectChat} />
          /* return <li>{item["name"]}</li> */
        })
      )}
    </div>
    <button className="create-room-btn" onClick={() => {
      const roomName = prompt("Enter room name:");
      if (roomName) onCreateRoom(roomName);
    }}>+ Create Room</button>
  </div>
}

export default Sidebar;
