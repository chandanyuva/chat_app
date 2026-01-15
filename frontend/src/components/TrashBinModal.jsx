import './TrashBinModal.css';

function TrashBinModal({ isOpen, onClose, trashRooms, onRestore, onDeletePermanent }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content trash-modal">
        <h3>Trash Bin</h3>
        <p className="trash-info">Rooms are permanently deleted after 3 days.</p>
        
        {trashRooms.length === 0 ? (
          <p className="no-trash">Trash is empty.</p>
        ) : (
          <ul className="trash-list">
            {trashRooms.map((room) => (
              <li key={room._id} className="trash-item">
                <div className="trash-room-name">
                  {room.name}
                  {room.isPrivate && <span className="badge-private">Private</span>}
                </div>
                <div className="trash-actions">
                  <button 
                    className="restore-btn" 
                    onClick={() => onRestore(room._id)}
                  >
                    Restore
                  </button>
                  <button 
                    className="delete-perm-btn" 
                    onClick={() => onDeletePermanent(room._id)}
                  >
                    Delete Forever
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="modal-actions">
          <button onClick={onClose} className="close-btn">Close</button>
        </div>
      </div>
    </div>
  );
}

export default TrashBinModal;
