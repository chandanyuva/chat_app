
import SidebarItem from "./SidebarItem";


function Sidebar({ chatList, selectedChatId, onSelectChat }) {
  // console.log("chatList in Sidebar:", chatList);
  if (!chatList || chatList.length === 0) {
    return <div>No Rooms Found.</div>
  }
  return <div className="sidebar">
    {chatList.map((room) => {
      return <SidebarItem key={room._id} id={room["_id"]} name={room["name"]} isSelected={room._id === selectedChatId} onSelectChat={onSelectChat} />
      /* return <li>{item["name"]}</li> */
    })}
  </div>
}

export default Sidebar;
