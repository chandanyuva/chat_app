function SidebarItem({ id, name, isSelected, onSelectRoom }) {
  return <div className={`sidebar-item ${isSelected ? "selected" : ""}`} onClick={() => { onSelectRoom(id) }}>
    {name}
  </div>
}

export default SidebarItem;
