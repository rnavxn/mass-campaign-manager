import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Rocket, RefreshCw } from 'lucide-react';
import { api } from '../api/campaigns';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressBar } from '../components/ProgressBar';

const POLL_INTERVAL = 3000;

function fmtEpoch(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function duration(startMs, endMs) {
  if (!startMs || !endMs) return '—';
  const diff = endMs - startMs;
  if (diff < 1000) return `${diff}ms`;
  if (diff < 60000) return `${(diff / 1000).toFixed(1)}s`;
  return `${Math.floor(diff / 60000)}m ${Math.floor((diff % 60000) / 1000)}s`;
}

function calcProgress(c) {
  if (!c?.totalRecipients) return 0;
  return ((c.successCount ?? 0) + (c.failureCount ?? 0)) / c.totalRecipients * 100;
}

// --- Stat Card ---
function StatCard({ label, value, sub }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-5 py-4 flex-1 min-w-0">
      <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className="font-mono text-2xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}

// --- Chunk status badge (reuse same CSS vars, smaller) ---
const CHUNK_STATUS_STYLES = {
  PENDING:    'text-draft border-draft/30 bg-draft/10',
  PROCESSING: 'text-running border-running/30 bg-running/10',
  COMPLETED:  'text-completed border-completed/30 bg-completed/10',
  FAILED:     'text-failed border-failed/30 bg-failed/10',
};

function ChunkBadge({ status }) {
  return (
    <span className={`font-mono text-[10px] font-medium px-2 py-0.5 rounded border ${CHUNK_STATUS_STYLES[status] ?? CHUNK_STATUS_STYLES.PENDING}`}>
      {status}
    </span>
  );
}

// --- Skeleton ---
function SkeletonDetail() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 bg-border rounded w-48" />
      <div className="flex gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex-1 bg-surface border border-border rounded-lg px-5 py-4 space-y-2">
            <div className="h-3 bg-border rounded w-16" />
            <div className="h-7 bg-border rounded w-20" />
          </div>
        ))}
      </div>
      <div className="h-3 bg-border rounded w-full" />
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-6 p-4 border-b border-border last:border-0">
            {[...Array(6)].map((_, j) => (
              <div key={j} className="h-3 bg-border rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Main ---
export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [launching, setLaunching] = useState(false);

  const pollRef = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      const [camp, chunkData] = await Promise.all([
        api.getCampaign(id),
        api.getChunks(id),
      ]);
      setCampaign(camp);
      const list = Array.isArray(chunkData) ? chunkData : (chunkData.chunks ?? chunkData.content ?? []);
      setChunks(list);
      return camp;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [id]);

  // Initial load
  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  // Polling — only while RUNNING
  useEffect(() => {
    if (!campaign) return;

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

  const handleLaunch = async () => {
    setLaunching(true);
    setError(null);
    try {
      await api.launchCampaign(id);
      const updated = await fetchAll();
      if (updated?.status === 'RUNNING') {
        // polling effect will kick in on next render
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLaunching(false);
    }
  };

  if (loading) return <SkeletonDetail />;

  if (error && !campaign) {
    return (
      <div className="space-y-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-main transition-colors">
          <ArrowLeft size={16} /> Back
        </Link>
        <div className="bg-failed/10 border border-failed/30 text-failed text-sm px-4 py-3 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  const progress = calcProgress(campaign);
  const totalSent = (campaign.successCount ?? 0) + (campaign.failureCount ?? 0);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="p-1.5 rounded-md text-muted hover:text-main hover:bg-border/40 transition-colors shrink-0">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight truncate">{campaign.name}</h1>
              <StatusBadge status={campaign.status} />
            </div>
            <p className="text-xs text-muted font-mono mt-0.5">
              #{campaign.id} · {campaign.channel ?? '—'} · created {fmtEpoch(campaign.createdAt)}
            </p>
          </div>
        </div>

        {/* Actions */}
        {campaign.status === 'DRAFT' && (
          <button
            onClick={handleLaunch}
            disabled={launching}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50 shrink-0"
          >
            <Rocket size={15} />
            {launching ? 'Launching…' : 'Launch'}
          </button>
        )}
        {campaign.status === 'FAILED' && (
          <button
            onClick={handleLaunch}
            disabled={launching}
            className="flex items-center gap-2 bg-surface border border-border hover:border-accent text-muted hover:text-accent text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={15} />
            {launching ? 'Retrying…' : 'Re-run'}
          </button>
        )}
      </div>

      {/* Error banner (non-fatal) */}
      {error && (
        <div className="bg-failed/10 border border-failed/30 text-failed text-sm px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Stat row */}
      <div className="flex gap-4">
        <StatCard
          label="Total Recipients"
          value={(campaign.totalRecipients ?? 0).toLocaleString()}
        />
        <StatCard
          label="Sent"
          value={(campaign.successCount ?? 0).toLocaleString()}
          sub={`${totalSent.toLocaleString()} processed total`}
        />
        <StatCard
          label="Failed"
          value={(campaign.failureCount ?? 0).toLocaleString()}
          sub={campaign.failureCount > 0
            ? `${((campaign.failureCount / totalSent) * 100).toFixed(1)}% failure rate`
            : 'clean'}
        />
        <StatCard
          label="Progress"
          value={`${Math.round(progress)}%`}
          sub={campaign.status === 'RUNNING' ? 'live' : campaign.status.toLowerCase()}
        />
      </div>

      {/* Progress bar */}
      <ProgressBar value={progress} height={6} status={campaign.status} />

      {/* Chunks table */}
      <div>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
          Execution Chunks
          <span className="ml-2 font-mono font-normal normal-case text-xs">({chunks.length})</span>
        </h2>

        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          {chunks.length === 0 ? (
            <p className="text-sm text-muted p-8 text-center">
              No chunks yet — launch the campaign to begin processing.
            </p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-muted text-xs uppercase tracking-wider font-semibold">
                  <th className="p-4 text-left">#</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-right">Processed</th>
                  <th className="p-4 text-right">Failed</th>
                  <th className="p-4 text-left">Started</th>
                  <th className="p-4 text-left">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {chunks
                  .slice()
                  .sort((a, b) => a.chunkIndex - b.chunkIndex)
                  .map(chunk => (
                    <tr key={chunk.id} className="hover:bg-border/20 transition-colors">
                      <td className="p-4 font-mono text-xs text-muted">{chunk.chunkIndex}</td>
                      <td className="p-4"><ChunkBadge status={chunk.status} /></td>
                      <td className="p-4 font-mono text-xs text-right">{chunk.processedCount}</td>
                      <td className="p-4 font-mono text-xs text-right">
                        <span className={chunk.failedCount > 0 ? 'text-failed' : 'text-muted'}>
                          {chunk.failedCount}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-muted">{fmtEpoch(chunk.createdAt)}</td>
                      <td className="p-4 font-mono text-xs text-muted">
                        {duration(chunk.createdAt, chunk.completedAt)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}