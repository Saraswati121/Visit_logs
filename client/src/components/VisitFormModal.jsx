import React, { useState, useEffect } from 'react';
import { fetchCurrentQuestionnaire } from '../services/api';

export default function VisitFormModal({ school, currentUser, onClose, onSubmitVisit }) {
  const [questionnaire, setQuestionnaire] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Form state: object mapping questionId => answer value
  const [answers, setAnswers] = useState({});
  // Validation errors: questionId => error message
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load current month questionnaire on mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setFetchError(null);

    fetchCurrentQuestionnaire()
      .then(data => {
        if (isMounted) {
          setQuestionnaire(data);
          // Initialize answers object
          const initialAnswers = {};
          (data.questions || []).forEach(q => {
            initialAnswers[q.questionId] = '';
          });
          setAnswers(initialAnswers);
        }
      })
      .catch(err => {
        if (isMounted) {
          setFetchError(err.message || 'Failed to load current month questionnaire');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleValueChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));

    // Clear validation error when user inputs value
    if (errors[questionId]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  /**
   * Device-side answer validation
   */
  const validateForm = () => {
    if (!questionnaire || !questionnaire.questions) return false;

    const validationErrors = {};

    for (const q of questionnaire.questions) {
      const val = answers[q.questionId];
      const isMissing = val === undefined || val === null || val === '';

      // Check required
      if (!q.optional && isMissing) {
        validationErrors[q.questionId] = 'This question is required.';
        continue;
      }

      // If answered, check type constraints
      if (!isMissing) {
        if (q.type === 'number') {
          const num = Number(val);
          if (isNaN(num)) {
            validationErrors[q.questionId] = 'Please enter a valid number.';
          } else {
            if (q.min !== undefined && num < q.min) {
              validationErrors[q.questionId] = `Value cannot be less than ${q.min}.`;
            }
            if (q.max !== undefined && num > q.max) {
              validationErrors[q.questionId] = `Value cannot exceed ${q.max}.`;
            }
          }
        }

        if (q.type === 'text' && q.maxLength) {
          if (String(val).length > q.maxLength) {
            validationErrors[q.questionId] = `Maximum ${q.maxLength} characters allowed (currently ${String(val).length}).`;
          }
        }

        if (q.type === 'singleChoice' && q.options && q.options.length > 0) {
          if (!q.options.includes(val)) {
            validationErrors[q.questionId] = 'Please select a valid option.';
          }
        }

        if (q.type === 'yesNo') {
          if (val !== 'Yes' && val !== 'No') {
            validationErrors[q.questionId] = 'Please select Yes or No.';
          }
        }
      }
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Device check answers before saving
    const isValid = validateForm();
    if (!isValid) {
      // Scroll to first error
      const firstErrorEl = document.querySelector('.field-error-message');
      if (firstErrorEl) {
        firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // 2. Record visitedAt as the EXACT TIME the user taps Submit
    const visitedAt = new Date().toISOString();

    // 3. Generate unique clientId on device
    const clientId = `CLIENT-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // 4. Format answers array according to server schema: [{ questionId, value }]
    const formattedAnswers = Object.entries(answers)
      .filter(([_, val]) => val !== '' && val !== undefined && val !== null)
      .map(([questionId, value]) => ({
        questionId,
        value: typeof value === 'number' ? value : String(value)
      }));

    const visitPayload = {
      clientId,
      userId: currentUser.userId,
      udiseCode: school.udiseCode,
      visitedAt,
      schoolName: school.schoolName,
      districtCode: school.districtCode,
      districtName: school.districtName,
      blockCode: school.blockCode,
      blockName: school.blockName,
      answers: formattedAnswers,
      questionnaireTitle: questionnaire.title
    };

    setIsSubmitting(true);
    try {
      await onSubmitVisit(visitPayload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container visit-form-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <div className="header-badge-row">
              <span className="school-tag">School Visit</span>
              {questionnaire && (
                <span className="month-locked-badge" title="Month is locked to the current active cycle">
                  🔒 {questionnaire.title}
                </span>
              )}
            </div>
            <h2 className="modal-title">{school.schoolName}</h2>
            <p className="modal-subtitle">
              UDISE: <strong>{school.udiseCode}</strong> | Block: {school.blockName} | District: {school.districtName}
            </p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body-scrollable">
          {loading && (
            <div className="loading-state-box">
              <span className="large-spinner" />
              <p>Fetching current month's questionnaire from server...</p>
            </div>
          )}

          {fetchError && (
            <div className="error-banner">
              <div className="error-icon">⚠️</div>
              <div className="error-content">
                <h4 className="error-title">Questionnaire Unavailable</h4>
                <p className="error-msg">{fetchError}</p>
                <p className="error-subnote">Please ensure the backend is running and the current month is seeded.</p>
              </div>
            </div>
          )}

          {!loading && questionnaire && (
            <form id="visit-form" onSubmit={handleSubmit} className="questionnaire-form" noValidate>
              <div className="form-info-callout">
                <div className="info-icon">ℹ️</div>
                <div className="info-text">
                  <strong>Current Month Observation:</strong> The month is automatically locked to the active cycle ({questionnaire.title}). Submit timestamp will be accurately recorded when you tap <strong>Submit Visit</strong>.
                </div>
              </div>

              {/* Dynamic Questions generated from Questionnaire */}
              <div className="questions-list">
                {questionnaire.questions.map((q, index) => {
                  const errorMsg = errors[q.questionId];
                  const currentValue = answers[q.questionId] ?? '';

                  return (
                    <div
                      key={q.questionId}
                      className={`question-card ${errorMsg ? 'has-error' : ''}`}
                    >
                      <div className="question-header">
                        <span className="question-number">Q{index + 1}</span>
                        <div className="question-title-area">
                          <label className="question-label" htmlFor={`q-input-${q.questionId}`}>
                            {q.text}
                          </label>
                          <div className="question-meta-row">
                            <span className="question-id-code">ID: {q.questionId}</span>
                            {q.optional ? (
                              <span className="optional-tag">Optional</span>
                            ) : (
                              <span className="required-tag">Required *</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Dynamic Input based on Question Type */}
                      <div className="question-input-wrapper">
                        {/* 1. yesNo Type */}
                        {q.type === 'yesNo' && (
                          <div className="yes-no-group">
                            <button
                              type="button"
                              className={`pill-choice-btn ${currentValue === 'Yes' ? 'selected yes' : ''}`}
                              onClick={() => handleValueChange(q.questionId, 'Yes')}
                            >
                              ✓ Yes
                            </button>
                            <button
                              type="button"
                              className={`pill-choice-btn ${currentValue === 'No' ? 'selected no' : ''}`}
                              onClick={() => handleValueChange(q.questionId, 'No')}
                            >
                              ✕ No
                            </button>
                          </div>
                        )}

                        {/* 2. Number Type */}
                        {q.type === 'number' && (
                          <div className="number-input-group">
                            <input
                              id={`q-input-${q.questionId}`}
                              type="number"
                              className={`form-input number-input ${errorMsg ? 'input-error' : ''}`}
                              value={currentValue}
                              min={q.min}
                              max={q.max}
                              placeholder={
                                q.min !== undefined && q.max !== undefined
                                  ? `Enter number between ${q.min} and ${q.max}`
                                  : 'Enter number'
                              }
                              onChange={e => handleValueChange(q.questionId, e.target.value)}
                            />
                            {(q.min !== undefined || q.max !== undefined) && (
                              <span className="input-constraint-hint">
                                Allowed range: {q.min ?? 0} to {q.max ?? 'any'}
                              </span>
                            )}
                          </div>
                        )}

                        {/* 3. singleChoice Type */}
                        {q.type === 'singleChoice' && (
                          <div className="single-choice-options">
                            {(q.options || []).map(option => (
                              <label
                                key={option}
                                className={`radio-option-card ${currentValue === option ? 'selected' : ''}`}
                              >
                                <input
                                  type="radio"
                                  name={`choice-${q.questionId}`}
                                  value={option}
                                  checked={currentValue === option}
                                  onChange={() => handleValueChange(q.questionId, option)}
                                />
                                <span className="radio-label-text">{option}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {/* 4. Text Type */}
                        {q.type === 'text' && (
                          <div className="text-input-group">
                            <textarea
                              id={`q-input-${q.questionId}`}
                              className={`form-textarea ${errorMsg ? 'input-error' : ''}`}
                              rows="3"
                              maxLength={q.maxLength}
                              value={currentValue}
                              placeholder="Write observations and remarks here..."
                              onChange={e => handleValueChange(q.questionId, e.target.value)}
                            />
                            {q.maxLength && (
                              <div className="char-counter">
                                {String(currentValue).length} / {q.maxLength} characters
                              </div>
                            )}
                          </div>
                        )}

                        {/* Inline Validation Error Message */}
                        {errorMsg && (
                          <div className="field-error-message">
                            ⚠️ {errorMsg}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer form-footer-bar">
          <div className="submit-note">
            Visitor: <strong>{currentUser.userName}</strong> ({currentUser.userId})
          </div>
          <div className="footer-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="visit-form"
              className="btn-primary submit-visit-btn"
              disabled={loading || !questionnaire || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="mini-spinner" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Submit Visit</span>
                  <span className="btn-time-hint">🕒 (Records Now)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
