import React, { useState } from 'react';

export default function MyVisits({
  visits,
  isLoading,
  error,
  onRefresh,
  onSyncOffline,
  isSyncing,
  onViewDetails
}) {
  const [filterTab, setFilterTab] = useState('ALL');

  const syncedCount = visits.filter(v => v.status === 'Synced').length;
  const pendingCount = visits.filter(v => v.status === 'Pending').length;
  const failedCount = visits.filter(v => v.status === 'Failed').length;

  const filteredVisits = visits.filter(v => {
    if (filterTab === 'SYNCED') return v.status === 'Synced';
    if (filterTab === 'PENDING') return v.status === 'Pending';
    if (filterTab === 'FAILED') return v.status === 'Failed';
    return true;
  });

  return (
    <div className="my-visits-container">
      {/* Top action bar & stats */}
      <div className="visits-header-card">
        <div className="visits-title-section">
          <h2 className="visits-main-title">My School Visits</h2>
          <p className="visits-subtitle">
            Overview of visits recorded on this device and synced with the central server
          </p>
        </div>

        <div className="visits-actions-bar">
          <button
            className="refresh-btn"
            onClick={onRefresh}
            disabled={isLoading || isSyncing}
            title="Refresh visits list"
          >
            🔄 Refresh
          </button>

          {(pendingCount > 0 || failedCount > 0) && (
            <button
              className="sync-now-btn"
              onClick={onSyncOffline}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <span className="mini-spinner" />
                  <span>Syncing Device Visits...</span>
                </>
              ) : (
                <>
                  <span>⚡ Sync Pending ({pendingCount + failedCount})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="status-tabs-row">
        <button
          className={`status-tab ${filterTab === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilterTab('ALL')}
        >
          All ({visits.length})
        </button>
        <button
          className={`status-tab ${filterTab === 'SYNCED' ? 'active' : ''}`}
          onClick={() => setFilterTab('SYNCED')}
        >
          ✓ Synced ({syncedCount})
        </button>
        <button
          className={`status-tab ${filterTab === 'PENDING' ? 'active' : ''}`}
          onClick={() => setFilterTab('PENDING')}
        >
          ⏳ Pending ({pendingCount})
        </button>
        <button
          className={`status-tab ${filterTab === 'FAILED' ? 'active' : ''}`}
          onClick={() => setFilterTab('FAILED')}
        >
          ⚠️ Failed ({failedCount})
        </button>
      </div>

      {/* Error banner if fetching failed */}
      {error && (
        <div className="error-banner">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <h4 className="error-title">Failed to load visits</h4>
            <p className="error-msg">{error}</p>
          </div>
          <button className="retry-btn" onClick={onRefresh}>
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="skeleton-list">
          {[1, 2, 3].map(i => (
            <div key={i} className="visit-card-skeleton">
              <div className="skeleton-line title" />
              <div className="skeleton-line subtitle" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredVisits.length === 0 && (
        <div className="empty-state-card">
          <div className="empty-state-icon">📋</div>
          <h3 className="empty-state-title">No Visits Found</h3>
          <p className="empty-state-desc">
            {filterTab === 'ALL'
              ? 'You have not submitted any school visits yet. Switch to "Schools & Log Visit" to record your first visit.'
              : `No visits found in ${filterTab.toLowerCase()} status.`}
          </p>
        </div>
      )}

      {/* Visits List */}
      {!isLoading && filteredVisits.length > 0 && (
        <div className="visits-list">
          {filteredVisits.map(visit => {
            const statusClass = (visit.status || 'Synced').toLowerCase();
            const formattedTime = visit.visitedAt
              ? new Date(visit.visitedAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })
              : 'Unknown date';

            return (
              <div key={visit.clientId} className={`visit-card card-status-${statusClass}`}>
                <div className="visit-card-top">
                  <div className="visit-school-info">
                    <h3 className="visit-school-name">{visit.schoolName || 'School Visit'}</h3>
                    <div className="visit-udise-badge">UDISE: {visit.udiseCode}</div>
                  </div>

                  <div className="status-badge-wrapper">
                    <span className={`status-badge status-${statusClass}`}>
                      {visit.status === 'Synced' && '✓ Synced'}
                      {visit.status === 'Pending' && '⏳ Pending'}
                      {visit.status === 'Failed' && '⚠️ Failed'}
                    </span>
                  </div>
                </div>

                {/* Prominently show each visit's clientId */}
                <div className="client-id-row">
                  <span className="client-id-title">Device Client ID:</span>
                  <code className="client-id-text">{visit.clientId}</code>
                </div>

                {/* Show the reason for any failure */}
                {visit.status === 'Failed' && visit.errorReason && (
                  <div className="failure-alert-box">
                    <strong>Reason for Failure:</strong> {visit.errorReason}
                  </div>
                )}

                {/* Visit summary details */}
                <div className="visit-summary-row">
                  <span className="summary-item">
                    🕒 <strong>Visited At:</strong> {formattedTime}
                  </span>
                  <span className="summary-item">
                    📝 <strong>Answers:</strong> {(visit.answers || []).length} questions
                  </span>
                </div>

                {/* Action button */}
                <div className="visit-card-footer">
                  <button
                    className="view-details-btn"
                    onClick={() => onViewDetails(visit)}
                  >
                    View Details & Answers →
                  </button>

                  {(visit.status === 'Pending' || visit.status === 'Failed') && (
                    <button
                      className="retry-single-sync-btn"
                      onClick={onSyncOffline}
                      disabled={isSyncing}
                    >
                      ⚡ Retry Sync
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
