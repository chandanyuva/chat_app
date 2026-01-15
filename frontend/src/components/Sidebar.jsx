
import SidebarItem from "./SidebarItem";


function Sidebar({ roomList, selectedRoomId, onSelectRoom, onCreateRoom, onOpenInvites, invitationCount }) {
  // console.log("roomList in Sidebar:", roomList);
  return <div className="sidebar">
    <div className="sidebar-header">
       {/* Could add a header here if needed */}
    </div>
    
    <button className="invitations-btn" onClick={onOpenInvites}>
      Invitations
      {invitationCount > 0 && <span className="badge">{invitationCount}</span>}
    </button>

    <div style={{ flex: 1, overflowY: "auto" }}>
      {(!roomList || roomList.length === 0) ? <div>No Rooms Found.</div> : (
        roomList.map((room) => {
          return <SidebarItem key={room._id} id={room["_id"]} name={room["name"]} isSelected={room._id === selectedRoomId} onSelectRoom={onSelectRoom} />
          /* return <li>{item["name"]}</li> */
        })
      )}
    </div>
    <button className="create-room-btn" onClick={onCreateRoom}>+ Create Room</button>
  </div>
}

export default Sidebar;
