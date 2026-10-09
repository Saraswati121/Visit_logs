const API_BASE = '/api';

export async function fetchSchools({ search = '', districtCode = '', blockCode = '', page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams();
  if (search.trim()) params.append('search', search.trim());
  if (districtCode) params.append('districtCode', districtCode);
  if (blockCode) params.append('blockCode', blockCode);
  params.append('page', page);
  params.append('limit', limit);

  const res = await fetch(`${API_BASE}/schools?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch schools (${res.status})`);
  }
  return res.json();
}

export async function fetchCurrentQuestionnaire() {
  const res = await fetch(`${API_BASE}/questionnaires/current`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to load current questionnaire (${res.status})`);
  }
  return res.json();
}

export async function postVisit(visitData) {
  const res = await fetch(`${API_BASE}/visits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(visitData)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Failed to submit visit (${res.status})`);
  }
  return data;
}

export async function fetchUserVisits(userId) {
  if (!userId) return { visits: [], total: 0 };
  const res = await fetch(`${API_BASE}/visits?userId=${encodeURIComponent(userId)}&limit=100`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to load visits (${res.status})`);
  }
  return res.json();
}

export async function fetchFilterOptions() {
  try {
    const distRes = await fetch(`${API_BASE}/districts`);
    if (distRes.ok) {
      const districts = await distRes.json();
      const blockRes = await fetch(`${API_BASE}/blocks`);
      const blocks = blockRes.ok ? await blockRes.json() : [];
      return { districts, blocks };
    }
  } catch (e) {
  }

  try {
    const res = await fetch(`${API_BASE}/schools?limit=100`);
    if (res.ok) {
      const data = await res.json();
      const districtMap = new Map();
      const blockMap = new Map();

      (data.schools || []).forEach(s => {
        if (s.districtCode && s.districtName) {
          districtMap.set(s.districtCode, { districtCode: s.districtCode, districtName: s.districtName });
        }
        if (s.blockCode && s.blockName) {
          blockMap.set(s.blockCode, { blockCode: s.blockCode, blockName: s.blockName, districtCode: s.districtCode });
        }
      });

      return {
        districts: Array.from(districtMap.values()).sort((a, b) => a.districtName.localeCompare(b.districtName)),
        blocks: Array.from(blockMap.values()).sort((a, b) => a.blockName.localeCompare(b.blockName))
      };
    }
  } catch (e) {
    console.warn('Could not extract filter options:', e);
  }

  return { districts: [], blocks: [] };
}
