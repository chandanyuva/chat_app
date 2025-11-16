function SidebarItem({ id, name, isSelected, onSelectChat }) {
  return <div className={`sidebar-item ${isSelected ? "selected" : ""}`} onClick={() => { onSelectChat(id) }}>
    {name}
  </div>
}

export default SidebarItem;
