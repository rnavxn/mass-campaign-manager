import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { api } from '../api/campaigns';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressBar } from '../components/ProgressBar';

const MOCK = [
  { id: 'c1', name: 'Black Friday Blast',      channel: 'EMAIL', status: 'RUNNING',   totalRecipients: 10000, processedRecipients: 5800, failedRecipients: 400,  createdAt: '2026-05-10T10:00:00Z' },
  { id: 'c2', name: 'Welcome Series',          channel: 'EMAIL', status: 'COMPLETED', totalRecipients: 5000,  processedRecipients: 4900, failedRecipients: 100,  createdAt: '2026-05-09T14:30:00Z' },
  { id: 'c3', name: 'Inactive Reactivation',   channel: 'SMS',   status: 'FAILED',    totalRecipients: 3000,  processedRecipients: 600,  failedRecipients: 60,   createdAt: '2026-05-08T09:15:00Z' },
  { id: 'c4', name: 'System Migration Notice', channel: 'EMAIL', status: 'DRAFT',     totalRecipients: 3500,  processedRecipients: 0,    failedRecipients: 0,    createdAt: '2026-05-12T11:00:00Z' },
];

function calcProgress(c) {
  if (!c.totalRecipients) return 0;
  return ((c.processedRecipients ?? 0) + (c.failedRecipients ?? 0)) / c.totalRecipients * 100;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// --- Stat Pill ---
function StatPill({ label, value, color }) {
  return (
    <div className="bg-surface border border-border px-4 py-1.5 rounded-full text-sm font-medium">
      <span className="text-muted mr-1.5">{label}:</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}

// --- Delete Modal ---
function DeleteModal({ campaign, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-xl p-7 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={18} className="text-failed shrink-0" />
          <h3 className="font-semibold text-failed">Delete campaign?</h3>
        </div>
        <p className="text-sm text-muted mb-6 leading-relaxed">
          <span className="text-main font-medium">"{campaign.name}"</span> will be permanently deleted. This cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} disabled={loading}
            className="px-4 py-2 rounded-md text-sm font-medium text-muted border border-border hover:text-main transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="px-4 py-2 rounded-md text-sm font-medium bg-failed/10 text-failed border border-failed/30 hover:bg-failed/20 transition-colors">
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Skeleton ---
function SkeletonRow() {
  return (
    <tr className="border-b border-border">
      {[...Array(7)].map((_, i) => (
        <td key={i} className="p-4">
          <div className="skeleton bg-border rounded h-3 w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// --- Main ---
export default function CampaignList() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.getCampaigns();
      const list = Array.isArray(data) ? data : (data.campaigns ?? data.content ?? []);
      setCampaigns(list);
    } catch {
      // backend not up yet — use mock so UI is always testable
      setCampaigns(MOCK);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = {
    total: campaigns.length,
    running: campaigns.filter(c => c.status === 'RUNNING').length,
    completed: campaigns.filter(c => c.status === 'COMPLETED').length,
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteCampaign(toDelete.id);
      setCampaigns(prev => prev.filter(c => c.id !== toDelete.id));
      setToDelete(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-3">Campaigns</h1>
          <div className="flex gap-2 flex-wrap">
            <StatPill label="Total" value={stats.total} />
            <StatPill label="Running" value={stats.running} color="var(--status-running)" />
            <StatPill label="Completed" value={stats.completed} color="var(--status-completed)" />
          </div>
        </div>
        <button
          onClick={() => navigate('/create')}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between bg-failed/10 border border-failed/30 text-failed text-sm px-4 py-3 rounded-md">
          <span>{error}</span>
          <button onClick={load} className="underline ml-4 hover:no-underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border text-muted text-xs uppercase tracking-wider font-semibold">
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Channel</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left w-48">Progress</th>
              <th className="p-4 text-left">Recipients</th>
              <th className="p-4 text-left">Created</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              [...Array(4)].map((_, i) => <SkeletonRow key={i} />)
            ) : campaigns.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-muted">
                  No campaigns yet.{' '}
                  <button onClick={() => navigate('/create')} className="text-accent hover:underline">
                    Create one.
                  </button>
                </td>
              </tr>
            ) : (
              campaigns.map(c => {
                const sent = (c.successCount ?? 0) + (c.failureCount ?? 0);
                return (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/campaigns/${c.id}`)}
                    className="hover:bg-border/20 cursor-pointer transition-colors group"
                  >
                    <td className="p-4 font-medium group-hover:text-accent transition-colors">
                      <div>{c.name}</div>
                      <div className="text-xs text-muted font-mono mt-0.5">#{c.id}</div>
                    </td>
                    <td className="p-4 text-muted font-mono text-xs">{c.channel ?? '—'}</td>
                    <td className="p-4"><StatusBadge status={c.status} /></td>
                    <td className="p-4"><ProgressBar value={calcProgress(c)} height={5} showLabel status={c.status} /></td>
                    <td className="p-4 font-mono text-xs text-muted">
                      {(c.processedRecipients ?? 0).toLocaleString()} / {(c.totalRecipients ?? 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-muted text-xs">{fmtDate(c.createdAt)}</td>
                    <td className="p-4" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setToDelete(c)}
                        className="p-1.5 rounded text-muted hover:text-failed hover:bg-failed/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {toDelete && (
        <DeleteModal
          campaign={toDelete}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}