import React from 'react';

export default function Header({ currentUser, onOpenUserModal, activeTab, onTabChange, pendingCount }) {
  return (
    <header className="app-header">
      <div className="header-top">
        <div className="brand-section">
          <div className="logo-badge">🏫</div>
          <div>
            <h1 className="brand-title">School Visit Log</h1>
            <span className="brand-subtitle">Field Observation & Inspection Portal</span>
          </div>
        </div>

        <div className="user-profile-widget" onClick={onOpenUserModal} title="Click to switch demo user">
          <div
            className="user-avatar-pill"
            style={{ backgroundColor: currentUser.color || '#3b82f6' }}
          >
            {currentUser.initials || 'U'}
          </div>
          <div className="user-profile-details">
            <span className="user-name">{currentUser.userName}</span>
            <span className="user-role-badge">{currentUser.role}</span>
          </div>
          <button className="switch-user-btn" type="button">
            Switch User ▾
          </button>
        </div>
      </div>

      <nav className="header-nav">
        <button
          className={`nav-tab ${activeTab === 'schools' ? 'active' : ''}`}
          onClick={() => onTabChange('schools')}
        >
          <span className="tab-icon">🔍</span>
          <span>Schools & Log Visit</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'visits' ? 'active' : ''}`}
          onClick={() => onTabChange('visits')}
        >
          {/* <span className="tab-icon">📋</span> */}
          {/* <span>My Visits</span> */}
          {pendingCount > 0 && (
            <span className="pending-badge-counter" title={`${pendingCount} visit(s) waiting to sync`}>
              {pendingCount}
            </span>
          )}
        </button>
      </nav>
    </header>
  );
}
