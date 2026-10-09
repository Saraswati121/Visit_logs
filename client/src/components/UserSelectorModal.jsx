import React from 'react';
import { DEMO_USERS } from '../constants/users';

export default function UserSelectorModal({ currentUser, onSelectUser, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Select Active User</h2>
            <p className="modal-subtitle">Pick one of the three demo users to record and view visits</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <div className="user-selection-list">
          {DEMO_USERS.map(user => {
            const isSelected = currentUser.userId === user.userId;
            return (
              <div
                key={user.userId}
                className={`user-card-selectable ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onSelectUser(user);
                  onClose();
                }}
              >
                <div
                  className="user-avatar-large"
                  style={{ backgroundColor: user.color }}
                >
                  {user.initials}
                </div>
                <div className="user-info-body">
                  <div className="user-card-header">
                    <h3 className="user-card-name">{user.userName}</h3>
                    {isSelected && <span className="current-badge">Active</span>}
                  </div>
                  <div className="user-card-meta">
                    <span className="user-id-tag">ID: {user.userId}</span>
                    <span className="user-role-tag">{user.role}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-footer">
          <p className="footer-note">
            💡 Your selection is stored in local storage and persists across restarts.
          </p>
        </div>
      </div>
    </div>
  );
}
