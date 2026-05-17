import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/campaigns';

const MOCK = [
  { id: 'c1', name: 'Black Friday Blast',      channel: 'EMAIL', status: 'RUNNING',   totalRecipients: 10000, processedRecipients: 5800, failedRecipients: 400,  createdAt: 1746820800000 },
  { id: 'c2', name: 'Welcome Series',          channel: 'EMAIL', status: 'COMPLETED', totalRecipients: 5000,  processedRecipients: 4900, failedRecipients: 100,  createdAt: 1746734400000 },
  { id: 'c3', name: 'Inactive Reactivation',   channel: 'SMS',   status: 'FAILED',    totalRecipients: 3000,  processedRecipients: 600,  failedRecipients: 60,   createdAt: 1746648000000 },
  { id: 'c4', name: 'System Migration Notice', channel: 'EMAIL', status: 'DRAFT',     totalRecipients: 3500,  processedRecipients: 0,    failedRecipients: 0,    createdAt: 1747000800000 },
];

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.getCampaigns();
      const list = Array.isArray(data) ? data : (data.campaigns ?? data.content ?? []);
      setCampaigns(list);
      return list;
    } catch {
      setCampaigns(MOCK);
      return MOCK;
    } finally {
      setLoading(false);
    }
  }, []);

  // background poll — silent, no loading state
  const poll = useCallback(async () => {
    try {
      const data = await api.getCampaigns();
      const list = Array.isArray(data) ? data : (data.campaigns ?? data.content ?? []);
      setCampaigns(list);
      return list;
    } catch {
      // silent during background poll
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // poll every 3s while any campaign is RUNNING
  useEffect(() => {
    const hasRunning = campaigns.some(c => c.status === 'RUNNING');
    if (!hasRunning) {
      clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollRef.current);
  }, [campaigns, poll]);

  const remove = useCallback((id) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
  }, []);

  return { campaigns, loading, error, refresh: load, remove };
}