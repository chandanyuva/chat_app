import './InvitationListModal.css';

function InvitationListModal({ isOpen, onClose, invitations, onAccept, onReject }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content invitation-modal">
        <h3>Pending Invitations</h3>
        {invitations.length === 0 ? (
          <p className="no-invites">No pending invitations.</p>
        ) : (
          <ul className="invitation-list">
            {invitations.map((inv) => (
              <li key={inv._id} className="invitation-item">
                <div className="invitation-info">
                  <span className="room-name">{inv.roomId?.name || "Unknown Room"}</span>
                  <span className="inviter-name">invited by {inv.inviterId?.username || "Unknown"}</span>
                </div>
                <div className="invitation-actions">
                  <button 
                    className="accept-btn" 
                    onClick={() => onAccept(inv.roomId._id)}
                  >
                    Accept
                  </button>
                  <button 
                    className="reject-btn" 
                    onClick={() => onReject(inv.roomId._id)}
                  >
                    Reject
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

export default InvitationListModal;
