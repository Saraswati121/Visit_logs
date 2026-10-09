import React, { useState } from 'react';

export default function VisitDetailsModal({ visit, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!visit) return null;

  const copyClientId = () => {
    navigator.clipboard.writeText(visit.clientId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = visit.visitedAt
    ? new Date(visit.visitedAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'medium'
      })
    : 'Unknown time';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container visit-details-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="header-badge-row">
              <span className={`status-badge status-${(visit.status || 'Synced').toLowerCase()}`}>
                {visit.status === 'Synced' && '✓ Synced'}
                {visit.status === 'Pending' && '⏳ Pending Sync'}
                {visit.status === 'Failed' && '⚠️ Failed'}
              </span>
              <span className="month-badge">
                Month: {visit.month || new Date(visit.visitedAt).getMonth() + 1}/{visit.year || new Date(visit.visitedAt).getFullYear()}
              </span>
            </div>
            <h2 className="modal-title">{visit.schoolName || 'School Visit Record'}</h2>
            <p className="modal-subtitle">UDISE: {visit.udiseCode}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <div className="modal-body-scrollable">
          {/* Prominent Client ID Box */}
          <div className="client-id-banner">
            <div className="client-id-info">
              <span className="client-id-label">Device Client ID (clientId)</span>
              <span className="client-id-value">{visit.clientId}</span>
            </div>
            <button className="copy-btn" onClick={copyClientId}>
              {copied ? '✓ Copied' : '📋 Copy ID'}
            </button>
          </div>

          {/* Failure reason banner if Failed */}
          {visit.status === 'Failed' && (
            <div className="failure-reason-box">
              <div className="failure-icon">⚠️</div>
              <div className="failure-details">
                <h4 className="failure-title">Sync Failure Reason</h4>
                <p className="failure-text">{visit.errorReason || 'Network request failed. Server was unreachable.'}</p>
              </div>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="details-info-grid">
            <div className="info-cell">
              <span className="cell-label">Visited At (Recorded Time)</span>
              <span className="cell-value">{formattedDate}</span>
            </div>
            <div className="info-cell">
              <span className="cell-label">Visitor User ID</span>
              <span className="cell-value">{visit.userId}</span>
            </div>
            <div className="info-cell">
              <span className="cell-label">District</span>
              <span className="cell-value">{visit.districtName || visit.districtCode || 'N/A'}</span>
            </div>
            <div className="info-cell">
              <span className="cell-label">Block</span>
              <span className="cell-value">{visit.blockName || visit.blockCode || 'N/A'}</span>
            </div>
          </div>

          {/* Submitted Answers Section */}
          <div className="answers-section">
            <h3 className="section-title">Submitted Questionnaire Answers</h3>
            {(!visit.answers || visit.answers.length === 0) ? (
              <p className="no-answers-note">No recorded answers in this visit record.</p>
            ) : (
              <div className="answers-table-wrapper">
                <table className="answers-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Question ID</th>
                      <th>Submitted Answer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visit.answers.map((ans, idx) => (
                      <tr key={ans.questionId || idx}>
                        <td className="row-num">{idx + 1}</td>
                        <td className="qid-cell"><code>{ans.questionId}</code></td>
                        <td className="answer-cell">
                          {ans.value === 'Yes' ? (
                            <span className="tag-yes">✓ Yes</span>
                          ) : ans.value === 'No' ? (
                            <span className="tag-no">✕ No</span>
                          ) : (
                            <strong>{String(ans.value)}</strong>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
