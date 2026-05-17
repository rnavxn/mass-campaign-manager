import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/campaigns';

const POLL_INTERVAL = 3000;

export function useCampaign(id) {
  const [campaign, setCampaign] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      const [camp, chunkData] = await Promise.all([
        api.getCampaign(id),
        api.getChunks(id),
      ]);
      setCampaign(camp);
      const list = Array.isArray(chunkData)
        ? chunkData
        : (chunkData.chunks ?? chunkData.content ?? []);
      setChunks(list);
      return camp;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [id]);

  // initial load
  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  // poll only while RUNNING
  useEffect(() => {
    if (!campaign) return;
    clearInterval(pollRef.current);

    if (campaign.status === 'RUNNING') {
      pollRef.current = setInterval(async () => {
        const updated = await fetchAll();
        if (updated && updated.status !== 'RUNNING') {
          clearInterval(pollRef.current);
        }
      }, POLL_INTERVAL);
    }

    return () => clearInterval(pollRef.current);
  }, [campaign?.status, fetchAll]);

  // call after launch/upload to sync latest state
  const refresh = useCallback(() => fetchAll(), [fetchAll]);

  return { campaign, chunks, loading, error, refresh, setCampaign };
}