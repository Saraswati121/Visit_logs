import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import UserSelectorModal from './components/UserSelectorModal';
import SchoolList from './components/SchoolList';
import VisitFormModal from './components/VisitFormModal';
import MyVisits from './components/MyVisits';
import VisitDetailsModal from './components/VisitDetailsModal';
import {
  getInitialUser,
  saveSelectedUser,
  getOfflineVisits,
  saveOfflineVisit,
  removeOfflineVisit,
  updateOfflineVisit,
  syncOfflineVisits
} from './services/storage';
import { fetchUserVisits, postVisit } from './services/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(getInitialUser);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('schools');

  const [schoolForVisit, setSchoolForVisit] = useState(null);
  const [selectedVisitDetails, setSelectedVisitDetails] = useState(null);

  const [combinedVisits, setCombinedVisits] = useState([]);
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);
  const [visitsError, setVisitsError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleSelectUser = newUser => {
    setCurrentUser(newUser);
    saveSelectedUser(newUser);
    showToast(`Switched active user to ${newUser.userName}`, 'success');
  };

  const loadVisits = useCallback(async () => {
    if (!currentUser || !currentUser.userId) return;

    setIsLoadingVisits(true);
    setVisitsError(null);

    try {
      const serverData = await fetchUserVisits(currentUser.userId).catch(err => {
        console.warn('Could not load server visits:', err);
        return { visits: [] };
      });

      const serverVisits = (serverData.visits || []).map(v => ({
        ...v,
        status: 'Synced'
      }));

      const offlineVisits = getOfflineVisits(currentUser.userId);

      const serverClientIds = new Set(serverVisits.map(v => v.clientId));
      const remainingOffline = [];

      offlineVisits.forEach(v => {
        if (serverClientIds.has(v.clientId)) {
          removeOfflineVisit(v.clientId);
        } else {
          remainingOffline.push(v);
        }
      });

      const combined = [...remainingOffline, ...serverVisits];

      combined.sort((a, b) => new Date(b.visitedAt || 0) - new Date(a.visitedAt || 0));

      setCombinedVisits(combined);
    } catch (err) {
      setVisitsError(err.message || 'Failed to load visits');
    } finally {
      setIsLoadingVisits(false);
    }
  }, [currentUser]);


  useEffect(() => {
    loadVisits();
  }, [loadVisits]);


  const handleSaveVisit = async visitPayload => {

    const localVisit = {
      ...visitPayload,
      status: 'Pending',
      errorReason: null
    };
    saveOfflineVisit(localVisit);
    loadVisits();

    try {
      await postVisit({
        clientId: visitPayload.clientId,
        userId: visitPayload.userId,
        udiseCode: visitPayload.udiseCode,
        visitedAt: visitPayload.visitedAt,
        answers: visitPayload.answers
      });

      removeOfflineVisit(visitPayload.clientId);
      showToast('✓ Visit successfully synced with server!', 'success');
      loadVisits();
    } catch (err) {
      console.warn('Submission to server failed, marked as Failed/Pending:', err);
      updateOfflineVisit(visitPayload.clientId, {
        status: 'Failed',
        errorReason: err.message || 'Server connection failed'
      });
      showToast('⚠️ Visit saved locally on device. Sync marked as Failed.', 'warning');
      loadVisits();
    }
  };

  const handleSyncOffline = async () => {
    setIsSyncing(true);
    try {
      await syncOfflineVisits(currentUser.userId, () => {
        loadVisits();
      });
      showToast('Finished sync attempt for pending device visits', 'info');
    } catch (err) {
      showToast('Sync encountered errors: ' + err.message, 'warning');
    } finally {
      setIsSyncing(false);
      loadVisits();
    }
  };

  const pendingCount = combinedVisits.filter(v => v.status === 'Pending' || v.status === 'Failed').length;

  return (
    <div className="app-layout">
      {/* Toast Alert */}
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          <div className="toast-text">{toast.message}</div>
          <button className="toast-close" onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      {/* Main Header */}
      <Header
        currentUser={currentUser}
        onOpenUserModal={() => setIsUserModalOpen(true)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingCount={pendingCount}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'schools' && (
          <SchoolList
            onLogVisit={school => setSchoolForVisit(school)}
          />
        )}

        {activeTab === 'visits' && (
          <MyVisits
            visits={combinedVisits}
            isLoading={isLoadingVisits}
            error={visitsError}
            onRefresh={loadVisits}
            onSyncOffline={handleSyncOffline}
            isSyncing={isSyncing}
            onViewDetails={visit => setSelectedVisitDetails(visit)}
          />
        )}
      </main>

      {/* User Selector Modal */}
      {isUserModalOpen && (
        <UserSelectorModal
          currentUser={currentUser}
          onSelectUser={handleSelectUser}
          onClose={() => setIsUserModalOpen(false)}
        />
      )}

      {/* Visit Form Modal */}
      {schoolForVisit && (
        <VisitFormModal
          school={schoolForVisit}
          currentUser={currentUser}
          onClose={() => setSchoolForVisit(null)}
          onSubmitVisit={handleSaveVisit}
        />
      )}

      {/* Visit Details Modal */}
      {selectedVisitDetails && (
        <VisitDetailsModal
          visit={selectedVisitDetails}
          onClose={() => setSelectedVisitDetails(null)}
        />
      )}
    </div>
  );
}
