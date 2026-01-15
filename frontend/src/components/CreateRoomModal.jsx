import { useState } from 'react';
import './CreateRoomModal.css';

function CreateRoomModal({ isOpen, onClose, onCreate }) {
  const [roomName, setRoomName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  if (!isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!roomName.trim()) return;
    onCreate(roomName, isPrivate);
    setRoomName("");
    setIsPrivate(false);
    onClose();
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Create New Room</h3>
        <form onSubmit={handleSubmit}>
          <input 
            type="text" 
            placeholder="Room Name" 
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
            autoFocus
            className="modal-input"
          />
          <div className="checkbox-group">
             <label>
               <input 
                 type="checkbox" 
                 checked={isPrivate} 
                 onChange={e => setIsPrivate(e.target.checked)}
               />
               Private Room (Invite Only)
             </label>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn">Cancel</button>
            <button type="submit" className="create-btn">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateRoomModal;
