import { useState } from 'react';
import './CreateRoomModal.css'; // Reusing CSS

function InviteUserModal({ isOpen, onClose, onInvite }) {
  const [username, setUsername] = useState("");

  if (!isOpen) return null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim()) return;
    onInvite(username);
    setUsername("");
    onClose();
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Invite User</h3>
        <form onSubmit={handleSubmit}>
          <input 
            type="text" 
            placeholder="Username to invite" 
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoFocus
            className="modal-input"
          />
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn">Cancel</button>
            <button type="submit" className="create-btn">Invite</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InviteUserModal;
