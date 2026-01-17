
import SidebarItem from "./SidebarItem";


function Sidebar({ roomList, selectedRoomId, onSelectRoom, onCreateRoom, unreadCounts }) {
  return <div className="sidebar">
    <div style={{ flex: 1, overflowY: "auto" }}>
      {(!roomList || roomList.length === 0) ? <div>No Rooms Found.</div> : (
        roomList.map((room) => {
          return <SidebarItem 
            key={room._id} 
            id={room["_id"]} 
            name={room["name"]} 
            isSelected={room._id === selectedRoomId} 
            onSelectRoom={onSelectRoom} 
            unreadCount={unreadCounts ? unreadCounts[room._id] : 0}
          />
        })
      )}
    </div>
    <button className="create-room-btn" onClick={onCreateRoom}>+ Create Room</button>
  </div>
}

export default Sidebar;
