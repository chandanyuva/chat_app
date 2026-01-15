
import SidebarItem from "./SidebarItem";


function Sidebar({ roomList, selectedRoomId, onSelectRoom, onCreateRoom }) {
  return <div className="sidebar">
    <div style={{ flex: 1, overflowY: "auto" }}>
      {(!roomList || roomList.length === 0) ? <div>No Rooms Found.</div> : (
        roomList.map((room) => {
          return <SidebarItem key={room._id} id={room["_id"]} name={room["name"]} isSelected={room._id === selectedRoomId} onSelectRoom={onSelectRoom} />
        })
      )}
    </div>
    <button className="create-room-btn" onClick={onCreateRoom}>+ Create Room</button>
  </div>
}

export default Sidebar;
