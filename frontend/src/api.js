const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const api = {
    // Fetch all campaigns for the dashboard
    getCampaigns: () => fetch(`${API_BASE}/api/campaigns`).then(res => res.json()),

    // Fetch single campaign details
    getCampaign: (id) => fetch(`${API_BASE}/api/campaigns/${id}`).then(res => res.json()),

    // Fetch execution chunks for a specific campaign
    getChunks: (id) => fetch(`${API_BASE}/api/campaigns/${id}/chunks`).then(res => res.json()),

    // Create the initial campaign record
    createCampaign: (data) => fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(res => res.json()),

    // Upload the CSV (using Multipart/Form-data)
    uploadCsv: (id, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return fetch(`${API_BASE}/api/campaigns/${id}/recipients`, {
            method: 'POST',
            body: formData
        });
    },

    // Trigger the launch
    launchCampaign: (id) => fetch(`${API_BASE}/api/campaigns/${id}/launch`, { method: 'POST' })
};