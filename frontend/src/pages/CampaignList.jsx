import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../api/campaigns';
import { useCampaigns } from '../hooks/useCampaigns';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressBar } from '../components/ProgressBar';
import { DeleteModal } from '../components/DeleteModal';

function fmtDate(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function calcProgress(c) {
  if (!c.totalRecipients) return 0;
  return ((c.processedRecipients ?? 0) + (c.failedRecipients ?? 0)) / c.totalRecipients * 100;
}

function StatPill({ label, value, color }) {
  return (
    <div className="bg-surface border border-border px-4 py-1.5 rounded-full text-sm font-medium">
      <span className="text-muted mr-1.5">{label}:</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}

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

export default function CampaignList() {
  const navigate = useNavigate();
  const { campaigns, loading, error, refresh, remove } = useCampaigns();
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const stats = {
    total: campaigns.length,
    running: campaigns.filter(c => c.status === 'RUNNING').length,
    completed: campaigns.filter(c => c.status === 'COMPLETED').length,
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteCampaign(toDelete.id);
      remove(toDelete.id);
      setToDelete(null);
    } catch (err) {
      setDeleteError(err.message.includes('DRAFT')
        ? 'Only DRAFT campaigns can be deleted.'
        : err.message);
      setToDelete(null);
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

      {/* Errors */}
      {(error || deleteError) && (
        <div className="flex items-center justify-between bg-failed/10 border border-failed/30 text-failed text-sm px-4 py-3 rounded-md">
          <span>{error || deleteError}</span>
          {error && <button onClick={refresh} className="underline ml-4 hover:no-underline">Retry</button>}
          {deleteError && <button onClick={() => setDeleteError(null)} className="underline ml-4 hover:no-underline">Dismiss</button>}
        </div>
      )}

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm border-collapse table-fixed">
          <thead>
            <tr className="border-b border-border text-muted text-xs uppercase tracking-wider font-semibold">
              <th className="p-4 text-left w-[220px]">Name</th>
              <th className="p-4 text-left w-[90px]">Channel</th>
              <th className="p-4 text-left w-[110px]">Status</th>
              <th className="p-4 text-left w-[160px]">Progress</th>
              <th className="p-4 text-left w-[120px]">Recipients</th>
              <th className="p-4 text-left w-[110px]">Created</th>
              <th className="p-4 w-[50px]" />
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
                const sent = (c.processedRecipients ?? 0) + (c.failedRecipients ?? 0);
                return (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/campaigns/${c.id}`)}
                    className="hover:bg-border/20 cursor-pointer transition-colors group"
                  >
                    <td className="p-4 font-medium group-hover:text-accent transition-colors max-w-0">
                      <div className="truncate">{c.name}</div>
                      <div className="text-xs text-muted font-mono mt-0.5 truncate">#{c.id}</div>
                    </td>
                    <td className="p-4 text-muted font-mono text-xs">{c.channel ?? '—'}</td>
                    <td className="p-4"><StatusBadge status={c.status} /></td>
                    <td className="p-4"><ProgressBar value={calcProgress(c)} height={5} showLabel status={c.status} /></td>
                    <td className="p-4 font-mono text-xs text-muted">
                      {sent.toLocaleString()} / {(c.totalRecipients ?? 0).toLocaleString()}
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
          name={toDelete.name}
          status={toDelete.status}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}