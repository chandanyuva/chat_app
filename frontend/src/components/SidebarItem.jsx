function SidebarItem({ id, name, isSelected, onSelectRoom, unreadCount }) {
  return <div className={`sidebar-item ${isSelected ? "selected" : ""}`} onClick={() => { onSelectRoom(id) }}>
    <span className="room-name">{name}</span>
    {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
  </div>
}

export default SidebarItem;
