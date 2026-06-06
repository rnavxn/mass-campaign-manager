import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Rocket, RefreshCw, UploadCloud, Trash2, CheckCircle2, Save, X, Settings2, FileSpreadsheet, ChevronLeft, ChevronRight, LayoutList } from 'lucide-react';
import { api } from '../api/campaigns';
import { useCampaign } from '../hooks/useCampaign';
import { StatusBadge } from '../components/StatusBadge';
import { ProgressBar } from '../components/ProgressBar';
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

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { campaign, chunks, loading, error, refresh, setCampaign } = useCampaign(id);

  // File Upload State
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false);

  // Action States
  const [launching, setLaunching] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Settings Edit State
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editChunkSize, setEditChunkSize] = useState(0);
  const [editRateLimit, setEditRateLimit] = useState(0);
  const [savingSettings, setSavingSettings] = useState(false);

  // Dynamic Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25); // Default to 25 instead of 10

  // Derive Paginated Chunks & Page Summaries
  const { paginatedChunks, totalPages, pageSent, pageFailed } = useMemo(() => {
    if (!chunks) return { paginatedChunks: [], totalPages: 0, pageSent: 0, pageFailed: 0 };
    
    const sorted = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
    const totalPages = Math.ceil(sorted.length / pageSize);
    
    // Ensure we don't end up on an empty page if size changes
    const safePage = Math.min(currentPage, Math.max(1, totalPages));
    if (safePage !== currentPage) setCurrentPage(safePage);

    const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
    
    const pageSent = paginated.reduce((sum, c) => sum + (c.processedCount || 0), 0);
    const pageFailed = paginated.reduce((sum, c) => sum + (c.failedCount || 0), 0);

    return { paginatedChunks: paginated, totalPages, pageSent, pageFailed };
  }, [chunks, currentPage, pageSize]);


  // ─── Actions ─────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setActionError(null);
    try {
      const data = await api.uploadRecipients(id, file);
      setCampaign(prev => ({ ...prev, totalRecipients: data.totalRecipients }));
      setFile(null); setReplaceMode(false);
    } catch (err) { setActionError(err.message); } 
    finally { setUploading(false); }
  };

  const handleLaunch = async () => {
    setLaunching(true); setActionError(null);
    try {
      await api.launchCampaign(id);
      await refresh();
    } catch (err) { setActionError(err.message); } 
    finally { setLaunching(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteCampaign(id);
      navigate('/');
    } catch (err) { setActionError(err.message); setShowDelete(false); } 
    finally { setDeleting(false); }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true); setActionError(null);
    try {
      const updated = await api.updateSettings(id, {
        chunkSize: Number(editChunkSize),
        rateLimitPerSecond: Number(editRateLimit)
      });
      setCampaign(prev => ({ 
        ...prev, 
        chunkSize: updated.chunkSize, 
        rateLimitPerSecond: updated.rateLimitPerSecond 
      }));
      setIsEditingSettings(false);
    } catch (err) { setActionError(err.message); } 
    finally { setSavingSettings(false); }
  };

  const startEditing = () => {
    setEditChunkSize(campaign.chunkSize);
    setEditRateLimit(campaign.rateLimitPerSecond);
    setIsEditingSettings(true);
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Loading campaign dashboard...</div>;
  if (error && !campaign) return <div className="text-failed p-8">{error}</div>;

  const progress = calcProgress(campaign);
  const totalSent = (campaign.processedRecipients ?? 0) + (campaign.failedRecipients ?? 0);
  const isDraft = campaign.status === 'DRAFT';

  return (
    <div className="space-y-6 pb-12 w-full"> 
      {/* Notice: Removed max-w-5xl, now takes full width seamlessly */}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 rounded-md text-muted hover:text-main hover:bg-border/40 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
              <StatusBadge status={campaign.status} />
            </div>
            <p className="text-sm text-muted font-mono mt-1">
              ID: {campaign.id} · Created {fmtEpoch(campaign.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDraft && (
            <button onClick={() => setShowDelete(true)} className="flex items-center gap-2 bg-surface border border-border hover:border-failed text-muted hover:text-failed text-sm font-medium px-4 py-2 rounded-md transition-colors">
              <Trash2 size={15} /> Delete
            </button>
          )}
          {campaign.status === 'FAILED' && (
            <button onClick={handleLaunch} disabled={launching} className="flex items-center gap-2 bg-surface border border-border hover:border-accent text-muted hover:text-accent text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50">
              <RefreshCw size={15} /> {launching ? 'Retrying…' : 'Re-run'}
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="bg-failed/10 border border-failed/30 text-failed text-sm px-4 py-3 rounded-md flex justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="underline hover:no-underline">Dismiss</button>
        </div>
      )}

      {/* Sleek Unified Metrics Banner */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center justify-between gap-8 mb-4">
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Total Recipients</p>
            <p className="text-2xl font-mono text-main">{(campaign.totalRecipients ?? 0).toLocaleString()}</p>
          </div>
          <div className="h-10 w-px bg-border"></div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Successfully Sent</p>
            <p className="text-2xl font-mono text-main">{(campaign.processedRecipients ?? 0).toLocaleString()}</p>
          </div>
          <div className="h-10 w-px bg-border"></div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Failed</p>
            <p className="text-2xl font-mono text-failed">{(campaign.failedRecipients ?? 0).toLocaleString()}</p>
          </div>
          <div className="h-10 w-px bg-border"></div>
          <div className="flex-1 text-right">
             <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Progress</p>
             <p className="text-2xl font-mono text-main">{Math.round(progress)}%</p>
          </div>
        </div>
        <ProgressBar value={progress} height={8} status={campaign.status} />
      </div>

      {/* Dynamic Layout: 2 Columns if Draft, 1 Full-Width Column if Active */}
      <div className={`grid grid-cols-1 ${isDraft ? 'lg:grid-cols-2' : ''} gap-6`}>
        
        {/* Settings Panel (Expands to full width when not in draft) */}
        <div className="bg-surface border border-border rounded-lg p-6 flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-base font-semibold flex items-center gap-2"><Settings2 size={18} className="text-muted"/> Configuration</h2>
            {isDraft && !isEditingSettings && (
              <button onClick={startEditing} className="text-xs font-medium bg-app border border-border px-3 py-1 rounded hover:text-accent transition-colors">Edit Settings</button>
            )}
          </div>
          
          <div className={`grid grid-cols-2 ${!isDraft ? 'md:grid-cols-4' : ''} gap-6 mb-6`}>
            <div>
              <p className="text-xs text-muted mb-1.5">Channel</p>
              <span className="font-mono text-xs bg-app border border-border px-2 py-1 rounded">{campaign.channel}</span>
            </div>
            <div>
              <p className="text-xs text-muted mb-1.5">Schedule</p>
              <p className="font-mono text-sm">{campaign.scheduledAt ? fmtEpoch(campaign.scheduledAt) : 'Immediate'}</p>
            </div>
            
            {/* Editable Fields */}
            <div>
              <p className="text-xs text-muted mb-1.5">Chunk Size</p>
              {isEditingSettings ? (
                <input type="number" className="w-full bg-app border border-border rounded px-3 py-1.5 text-sm font-mono focus:border-accent outline-none" value={editChunkSize} onChange={e => setEditChunkSize(e.target.value)} />
              ) : (
                <p className="font-mono text-sm">{campaign.chunkSize}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted mb-1.5">Rate Limit / sec</p>
              {isEditingSettings ? (
                <input type="number" className="w-full bg-app border border-border rounded px-3 py-1.5 text-sm font-mono focus:border-accent outline-none" value={editRateLimit} onChange={e => setEditRateLimit(e.target.value)} />
              ) : (
                <p className="font-mono text-sm">{campaign.rateLimitPerSecond}</p>
              )}
            </div>
          </div>

          {isEditingSettings && (
            <div className="flex justify-end gap-2 mt-auto pt-5 border-t border-border">
              <button onClick={() => setIsEditingSettings(false)} className="flex items-center gap-1.5 bg-app border border-border text-muted text-sm font-medium px-4 py-2 rounded hover:text-main">
                Cancel
              </button>
              <button onClick={handleSaveSettings} disabled={savingSettings} className="flex items-center gap-1.5 bg-accent text-white text-sm font-medium px-6 py-2 rounded hover:bg-accent-hover disabled:opacity-50">
                <Save size={16}/> {savingSettings ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}

          {!isEditingSettings && (
            <div className="mt-auto pt-5 border-t border-border">
              <p className="text-xs text-muted mb-2">Message Template</p>
              <pre className="text-sm font-mono text-muted bg-app p-4 rounded-md border border-border whitespace-pre-wrap break-words">
                {campaign.messageTemplate}
              </pre>
            </div>
          )}
        </div>

        {/* Upload/Launch Panel (Only active in DRAFT) */}
        {isDraft && (
          <div className="bg-surface border border-border rounded-lg p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-base font-semibold flex items-center gap-2"><FileSpreadsheet size={18} className="text-muted"/> Data Ingestion</h2>
              </div>
              
              {campaign.totalRecipients > 0 && !file && !replaceMode ? (
                <div className="border border-border bg-app rounded-lg p-5 flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <CheckCircle2 size={24} className="text-completed" />
                    <div>
                      <p className="text-base font-medium">{campaign.totalRecipients.toLocaleString()} Ready</p>
                      <p className="text-xs text-muted">Recipients loaded in database.</p>
                    </div>
                  </div>
                  <button onClick={() => setReplaceMode(true)} className="text-xs font-medium text-muted hover:text-accent border border-border bg-surface px-3 py-1.5 rounded transition-colors">Replace CSV</button>
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  {replaceMode && <p className="text-xs text-failed font-medium px-2">Warning: Overwriting existing campaign data.</p>}
                  <UploadDropzone file={file} onChange={f => { setFile(f); setActionError(null); }} />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
              <button onClick={handleUpload} disabled={!file || uploading} className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-md border border-border hover:border-accent text-muted hover:text-accent transition-colors disabled:opacity-40">
                <UploadCloud size={16} /> {uploading ? 'Uploading…' : 'Upload CSV'}
              </button>
              <button onClick={handleLaunch} disabled={launching || campaign.totalRecipients === 0 || isEditingSettings} className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-6 py-2.5 rounded-md transition-colors disabled:opacity-40 shadow-sm">
                <Rocket size={16} /> {launching ? 'Launching…' : 'Launch Campaign'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chunks Ledger with Dynamic Pagination */}
      <div>
        <div className="flex justify-between items-end mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-semibold text-main flex items-center gap-2">
              <LayoutList size={18} className="text-muted"/> Execution Ledger 
              <span className="font-mono font-normal text-xs text-muted bg-surface border border-border px-2 py-0.5 rounded-full">{chunks.length} chunks</span>
            </h2>
          </div>
          
          {/* PAGE SUMMARY */}
          {chunks.length > 0 && (
            <div className="text-xs font-mono bg-surface border border-border px-3 py-1.5 rounded-md text-muted">
              Current Page: <span className="text-main">{pageSent} sent</span>, <span className={pageFailed > 0 ? "text-failed" : "text-main"}>{pageFailed} failed</span>
            </div>
          )}
        </div>

        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          {chunks.length === 0 ? (
            <p className="text-sm text-muted p-10 text-center">No execution data available. Launch the campaign to begin.</p>
          ) : (
            <>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-app/50 text-muted text-xs uppercase tracking-wider font-semibold">
                    <th className="p-4 text-left w-16">#</th>
                    <th className="p-4 text-left">Status</th>
                    <th className="p-4 text-right">Processed</th>
                    <th className="p-4 text-right">Failed</th>
                    <th className="p-4 text-left">Started</th>
                    <th className="p-4 text-left">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedChunks.map(chunk => (
                    <tr key={chunk.id} className="hover:bg-border/20 transition-colors">
                      <td className="p-4 font-mono text-xs text-muted">{chunk.chunkIndex}</td>
                      <td className="p-4"><ChunkBadge status={chunk.status} /></td>
                      <td className="p-4 font-mono text-xs text-right">{chunk.processedCount}</td>
                      <td className="p-4 font-mono text-xs text-right">
                        <span className={chunk.failedCount > 0 ? 'text-failed font-medium bg-failed/10 px-2 py-0.5 rounded' : 'text-muted'}>{chunk.failedCount}</span>
                      </td>
                      <td className="p-4 text-xs text-muted">{fmtEpoch(chunk.createdAt)}</td>
                      <td className="p-4 font-mono text-xs text-muted">{duration(chunk.createdAt, chunk.completedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Dynamic Pagination Controls */}
              {chunks.length > 0 && (
                <div className="flex items-center justify-between border-t border-border p-4 bg-app/30">
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-muted font-medium">
                      Showing <span className="text-main font-mono">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-main font-mono">{Math.min(currentPage * pageSize, chunks.length)}</span> of <span className="text-main font-mono">{chunks.length}</span>
                    </p>
                    <select 
                      className="bg-surface border border-border text-xs text-muted rounded px-2 py-1 outline-none focus:border-accent cursor-pointer"
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                    >
                      <option value={10}>10 rows</option>
                      <option value={25}>25 rows</option>
                      <option value={50}>50 rows</option>
                      <option value={100}>100 rows</option>
                    </select>
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="flex gap-1">
                      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 border border-border rounded text-muted hover:text-main hover:bg-border/50 disabled:opacity-30 transition-colors"><ChevronLeft size={16}/></button>
                      <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 border border-border rounded text-muted hover:text-main hover:bg-border/50 disabled:opacity-30 transition-colors"><ChevronRight size={16}/></button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showDelete && <DeleteModal name={campaign.name} status={campaign.status} onConfirm={handleDelete} onCancel={() => setShowDelete(false)} loading={deleting} />}
    </div>
  );
}