const BASE = '/api';

async function handleResponse(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

export const api = {
  getCampaigns: () =>
    fetch(`${BASE}/campaigns`).then(handleResponse),

  getCampaign: (id) =>
    fetch(`${BASE}/campaigns/${id}`).then(handleResponse),

  getChunks: (id) =>
    fetch(`${BASE}/campaigns/${id}/chunks`).then(handleResponse),

  createCampaign: (body) =>
    fetch(`${BASE}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(handleResponse),

  uploadRecipients: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch(`${BASE}/campaigns/${id}/recipients`, {
      method: 'POST',
      body: fd,
    }).then(handleResponse);
  },

  launchCampaign: (id) =>
    fetch(`${BASE}/campaigns/${id}/launch`, { method: 'POST' }).then(handleResponse),

  deleteCampaign: (id) =>
    fetch(`${BASE}/campaigns/${id}`, { method: 'DELETE' }).then(handleResponse),

  updateSettings: async (id, data) => {
    const res = await fetch(`/api/campaigns/${id}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },
};