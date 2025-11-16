
import SidebarItem from "./SidebarItem";


function Sidebar({ chatList, selectedChatId, onSelectChat }) {
  return <div className="sidebar">
    {chatList.map((item) => {
      return <SidebarItem key={item.id} id={item["id"]} name={item["name"]} isSelected={item.id === selectedChatId} onSelectChat={onSelectChat} />
      /* return <li>{item["name"]}</li> */
    })}
  </div>
}

export default Sidebar;
