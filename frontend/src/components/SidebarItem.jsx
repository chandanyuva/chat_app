function SidebarItem({ id, name, isSelected, onSelectChat }) {
  const style = isSelected ? { fontWeight: "bold" } : {};
  return <div onClick={() => { onSelectChat(id) }} style={style}>
    {name}
  </div>
}

export default SidebarItem;
