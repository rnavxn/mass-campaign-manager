import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Rocket, RefreshCw, UploadCloud, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '../api/campaigns';
import { useCampaign } from '../hooks/useCampaign';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressBar } from '../components/ProgressBar';
import { StatCard } from '../components/StatCard';
import { ChunkBadge } from '../components/ChunkBadge';
import { DeleteModal } from '../components/DeleteModal';
import { UploadDropzone } from '../components/UploadDropzone';

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
  return ((c.processedRecipients ?? 0) + (c.failedRecipients ?? 0)) / c.totalRecipients * 100;
}

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
        {[...Array(4)].map((_, i) => (
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

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { campaign, chunks, loading, error, refresh, setCampaign } = useCampaign(id);

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [replaceMode, setReplaceMode] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setActionError(null);
    try {
      const data = await api.uploadRecipients(id, file);
      setCampaign(prev => ({ ...prev, totalRecipients: data.totalRecipients }));
      setFile(null);
      setReplaceMode(false);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLaunch = async () => {
    setLaunching(true);
    setActionError(null);
    try {
      await api.launchCampaign(id);
      await refresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setLaunching(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteCampaign(id);
      navigate('/');
    } catch (err) {
      setActionError(err.message);
      setShowDelete(false);
    } finally {
      setDeleting(false);
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
  const totalSent = (campaign.processedRecipients ?? 0) + (campaign.failedRecipients ?? 0);

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

        {/* Header actions */}
        <div className="flex items-center gap-2 shrink-0">
          {campaign.status === 'DRAFT' && (
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-2 bg-surface border border-border hover:border-failed text-muted hover:text-failed text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              <Trash2 size={15} /> Delete
            </button>
          )}
          {campaign.status === 'FAILED' && (
            <button
              onClick={handleLaunch}
              disabled={launching}
              className="flex items-center gap-2 bg-surface border border-border hover:border-accent text-muted hover:text-accent text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            >
              <RefreshCw size={15} />
              {launching ? 'Retrying…' : 'Re-run'}
            </button>
          )}
        </div>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="bg-failed/10 border border-failed/30 text-failed text-sm px-4 py-3 rounded-md flex justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="underline hover:no-underline">Dismiss</button>
        </div>
      )}

      {/* Stat row */}
      <div className="flex gap-4">
        <StatCard label="Total Recipients" value={(campaign.totalRecipients ?? 0).toLocaleString()} />
        <StatCard
          label="Sent"
          value={(campaign.processedRecipients ?? 0).toLocaleString()}
          sub={`${totalSent.toLocaleString()} processed total`}
        />
        <StatCard
          label="Failed"
          value={(campaign.failedRecipients ?? 0).toLocaleString()}
          sub={campaign.failedRecipients > 0
            ? `${((campaign.failedRecipients / totalSent) * 100).toFixed(1)}% failure rate`
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

      {/* DRAFT — upload + launch */}
      {campaign.status === 'DRAFT' && (
        <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold mb-1">Recipients</h2>
            <p className="text-xs text-muted">
              {campaign.totalRecipients > 0
                ? `${campaign.totalRecipients.toLocaleString()} recipients loaded. Upload a new CSV to replace.`
                : 'No recipients yet. Upload a CSV to continue.'}
            </p>
          </div>
          
          {/* If we have recipients, no file selected yet, and aren't in replace mode, show the Success block */}
          {campaign.totalRecipients > 0 && !file && !replaceMode ? (
            <div className="border border-border bg-app rounded-lg p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-completed/10 text-completed rounded-full flex items-center justify-center">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium">{campaign.totalRecipients.toLocaleString()} Recipients Saved</p>
                  <p className="text-xs text-muted mt-0.5">CSV data is safely stored in the database.</p>
                </div>
              </div>
              <button 
                onClick={() => setReplaceMode(true)} 
                className="text-xs font-medium text-muted hover:text-accent transition-colors px-3 py-1.5 border border-border rounded-md hover:border-accent"
              >
                Replace CSV
              </button>
            </div>
          ) : (
            /* Otherwise, show the standard dropzone */
            <div className="space-y-3">
              {replaceMode && (
                <div className="flex items-center justify-between text-xs bg-secondary/30 border border-border px-3 py-2 rounded-md animate-fadeIn">
                  <span className="text-muted">
                      Uploading a new file will <span className="text-main font-medium">overwrite</span> the existing campaign recipients.
                  </span>
                  <button 
                    type="button" 
                    onClick={() => { setReplaceMode(false); setFile(null); }}
                    className="text-accent hover:underline font-medium"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <UploadDropzone file={file} onChange={f => { setFile(f); setActionError(null); }} />
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md border border-border hover:border-accent text-muted hover:text-accent transition-colors disabled:opacity-40"
            >
              <UploadCloud size={14} />
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <button
              onClick={handleLaunch}
              disabled={launching || campaign.totalRecipients === 0}
              title={campaign.totalRecipients === 0 ? 'Upload recipients first' : ''}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-40"
            >
              <Rocket size={14} />
              {launching ? 'Launching…' : 'Launch'}
            </button>
          </div>
        </div>
      )}

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

      {showDelete && (
        <DeleteModal
          name={campaign.name}
          status={campaign.status}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          loading={deleting}
        />
      )}
    </div>
  );
}