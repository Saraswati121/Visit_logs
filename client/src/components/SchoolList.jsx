import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchSchools, fetchFilterOptions } from '../services/api';

export default function SchoolList({ onLogVisit }) {
  const [schools, setSchools] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalSchools, setTotalSchools] = useState(0);

  // Search input state (immediate input vs debounced search)
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filters
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('');

  // Filter options
  const [filterOptions, setFilterOptions] = useState({ districts: [], blocks: [] });

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Sentinel ref for infinite scroll
  const observerTarget = useRef(null);

  // 1. Debounce logic: wait 400ms after user stops typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(inputValue);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue]);

  // 2. Load filter options on mount
  useEffect(() => {
    let isMounted = true;
    fetchFilterOptions().then(options => {
      if (isMounted) {
        setFilterOptions(options);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Load initial or filter-changed schools (page 1)
  const loadSchools = useCallback(async (pageNum, isReset = false) => {
    if (isReset) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const data = await fetchSchools({
        search: debouncedSearch,
        districtCode: selectedDistrict,
        blockCode: selectedBlock,
        page: pageNum,
        limit: 20
      });

      const newSchools = data.schools || [];
      const total = data.total || 0;

      setTotalSchools(total);
      setSchools(prev => (isReset ? newSchools : [...prev, ...newSchools]));
      setHasMore(pageNum * 20 < total);
      setPage(pageNum);
    } catch (err) {
      setError(err.message || 'Failed to fetch schools');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [debouncedSearch, selectedDistrict, selectedBlock]);

  // When search or filters change, reset to page 1
  useEffect(() => {
    loadSchools(1, true);
  }, [debouncedSearch, selectedDistrict, selectedBlock, loadSchools]);

  // 4. Infinite scroll intersection observer
  useEffect(() => {
    if (isLoading || isLoadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadSchools(page + 1, false);
        }
      },
      { threshold: 0.2 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [hasMore, isLoading, isLoadingMore, page, loadSchools]);

  // Filter blocks by selected district if selected
  const availableBlocks = selectedDistrict
    ? filterOptions.blocks.filter(b => b.districtCode === selectedDistrict)
    : filterOptions.blocks;

  const handleDistrictChange = e => {
    setSelectedDistrict(e.target.value);
    setSelectedBlock(''); // Reset block when district changes
  };

  return (
    <div className="school-browser-container">
      {/* Search and Filters Bar */}
      <div className="filters-card">
        <div className="search-bar-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search by school name or UDISE code..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
          />
          {inputValue && (
            <button
              className="clear-search-btn"
              onClick={() => setInputValue('')}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="filters-row">
          <div className="filter-group">
            <label className="filter-label" htmlFor="district-select">District Filter:</label>
            <select
              id="district-select"
              className="filter-select"
              value={selectedDistrict}
              onChange={handleDistrictChange}
            >
              <option value="">All Districts</option>
              {filterOptions.districts.map(d => (
                <option key={d.districtCode} value={d.districtCode}>
                  {d.districtName} ({d.districtCode})
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="block-select">Block Filter:</label>
            <select
              id="block-select"
              className="filter-select"
              value={selectedBlock}
              onChange={e => setSelectedBlock(e.target.value)}
            >
              <option value="">All Blocks</option>
              {availableBlocks.map(b => (
                <option key={b.blockCode} value={b.blockCode}>
                  {b.blockName} ({b.blockCode})
                </option>
              ))}
            </select>
          </div>

          {(selectedDistrict || selectedBlock || inputValue) && (
            <button
              className="reset-filters-btn"
              onClick={() => {
                setInputValue('');
                setSelectedDistrict('');
                setSelectedBlock('');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="filter-status-row">
          <span className="results-counter">
            {isLoading ? 'Searching...' : `Found ${totalSchools.toLocaleString()} schools`}
          </span>
          {inputValue !== debouncedSearch && (
            <span className="typing-indicator">Typing... waiting for you to pause</span>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="error-banner">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <h4 className="error-title">Error Loading Schools</h4>
            <p className="error-msg">{error}</p>
          </div>
          <button className="retry-btn" onClick={() => loadSchools(1, true)}>
            Retry
          </button>
        </div>
      )}

      {/* Initial Loading Skeleton */}
      {isLoading && (
        <div className="skeleton-list">
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="school-card-skeleton">
              <div className="skeleton-line title" />
              <div className="skeleton-line subtitle" />
              <div className="skeleton-line meta" />
            </div>
          ))}
        </div>
      )}

      {/* Empty Results state */}
      {!isLoading && !error && schools.length === 0 && (
        <div className="empty-state-card">
          <div className="empty-state-icon">🏫</div>
          <h3 className="empty-state-title">No Schools Found</h3>
          <p className="empty-state-desc">
            We couldn't find any schools matching your search query and filters. Try adjusting your search term or clearing the filters.
          </p>
          {(selectedDistrict || selectedBlock || inputValue) && (
            <button
              className="empty-state-btn"
              onClick={() => {
                setInputValue('');
                setSelectedDistrict('');
                setSelectedBlock('');
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Schools List */}
      {!isLoading && schools.length > 0 && (
        <div className="schools-grid">
          {schools.map(school => (
            <div key={school._id || school.udiseCode} className="school-card">
              <div className="school-card-header">
                <div>
                  <h3 className="school-name">{school.schoolName}</h3>
                  <div className="udise-pill">UDISE: {school.udiseCode}</div>
                </div>
                <button
                  className="log-visit-btn"
                  onClick={() => onLogVisit(school)}
                >
                  <span>Log Visit</span>
                  <span className="btn-arrow">→</span>
                </button>
              </div>

              <div className="school-details-grid">
                <div className="detail-item">
                  <span className="detail-label">District</span>
                  <span className="detail-value">{school.districtName || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Block</span>
                  <span className="detail-value">{school.blockName || 'N/A'}</span>
                </div>
                {school.clusterName && (
                  <div className="detail-item">
                    <span className="detail-label">Cluster</span>
                    <span className="detail-value">{school.clusterName}</span>
                  </div>
                )}
                {school.category && (
                  <div className="detail-item">
                    <span className="detail-label">Category</span>
                    <span className="detail-value">{school.category}</span>
                  </div>
                )}
                {school.school_type && (
                  <div className="detail-item">
                    <span className="detail-label">Type</span>
                    <span className="detail-value">{school.school_type}</span>
                  </div>
                )}
                {(school.classFrom || school.classTo) && (
                  <div className="detail-item">
                    <span className="detail-label">Classes</span>
                    <span className="detail-value">{school.classFrom || '1'} to {school.classTo || '10'}</span>
                  </div>
                )}
              </div>

              {school.address && (
                <div className="school-address">
                  📍 {school.address}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Infinite Scroll Sentinel & Loader */}
      <div ref={observerTarget} className="scroll-sentinel">
        {isLoadingMore && (
          <div className="loading-more-indicator">
            <span className="mini-spinner" />
            <span>Loading more schools as you scroll...</span>
          </div>
        )}
        {!hasMore && schools.length > 0 && !isLoading && (
          <div className="end-of-results">
            ✓ All matching schools loaded ({schools.length} of {totalSchools})
          </div>
        )}
      </div>
    </div>
  );
}
