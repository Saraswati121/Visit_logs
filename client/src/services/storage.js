import { DEMO_USERS, STORAGE_KEYS } from '../constants/users';
import { postVisit } from './api';

export function getInitialUser() {
  const savedId = localStorage.getItem(STORAGE_KEYS.SELECTED_USER);
  const matched = DEMO_USERS.find(u => u.userId === savedId);
  return matched || DEMO_USERS[0];
}

export function saveSelectedUser(user) {
  if (user && user.userId) {
    localStorage.setItem(STORAGE_KEYS.SELECTED_USER, user.userId);
  }
}

export function getOfflineVisits(userId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_VISITS);
    const list = raw ? JSON.parse(raw) : [];
    if (!userId) return list;
    return list.filter(v => v.userId === userId);
  } catch (e) {
    console.error('Error reading offline visits:', e);
    return [];
  }
}

export function saveOfflineVisit(visit) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_VISITS);
    const list = raw ? JSON.parse(raw) : [];
    const index = list.findIndex(v => v.clientId === visit.clientId);
    if (index >= 0) {
      list[index] = { ...list[index], ...visit };
    } else {
      list.unshift(visit);
    }
    localStorage.setItem(STORAGE_KEYS.OFFLINE_VISITS, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving offline visit:', e);
  }
}

export function removeOfflineVisit(clientId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_VISITS);
    const list = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(v => v.clientId !== clientId);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_VISITS, JSON.stringify(filtered));
  } catch (e) {
    console.error('Error removing offline visit:', e);
  }
}

export function updateOfflineVisit(clientId, updates) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_VISITS);
    const list = raw ? JSON.parse(raw) : [];
    const updated = list.map(v => (v.clientId === clientId ? { ...v, ...updates } : v));
    localStorage.setItem(STORAGE_KEYS.OFFLINE_VISITS, JSON.stringify(updated));
  } catch (e) {
    console.error('Error updating offline visit:', e);
  }
}

/**
 * Attempts to submit all pending/failed visits for a user to the server
 */
export async function syncOfflineVisits(userId, onProgress) {
  const offlineList = getOfflineVisits(userId);
  const pendingOrFailed = offlineList.filter(v => v.status === 'Pending' || v.status === 'Failed');

  for (const item of pendingOrFailed) {
    try {
      updateOfflineVisit(item.clientId, { status: 'Pending', errorReason: null });
      if (onProgress) onProgress();

      await postVisit({
        clientId: item.clientId,
        userId: item.userId,
        udiseCode: item.udiseCode,
        visitedAt: item.visitedAt,
        answers: item.answers
      });

      // Successfully synced on server:
      // Remove from offline storage queue
      removeOfflineVisit(item.clientId);
      if (onProgress) onProgress();
    } catch (err) {
      updateOfflineVisit(item.clientId, {
        status: 'Failed',
        errorReason: err.message || 'Network connection failed'
      });
      if (onProgress) onProgress();
    }
  }
}
