import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Rocket, CheckCircle2, Pencil, FileSpreadsheet } from 'lucide-react';
import { api } from '../api/campaigns';
import { UploadDropzone } from '../components/UploadDropzone';

const STEPS = ['Details', 'Recipients', 'Launch'];

const getMinDateTime = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-2 mb-8 text-sm font-medium">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${active ? 'text-accent' : done ? 'text-completed' : 'text-muted'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border transition-colors
                ${active ? 'border-accent bg-accent/10 text-accent' : done ? 'border-completed bg-completed/10 text-completed' : 'border-border'}`}>
                {done ? <CheckCircle2 size={14} /> : n}
              </span>
              {label}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-8 transition-colors ${current > n ? 'bg-completed' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CreateCampaign() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [campaignId, setCampaignId] = useState(null);
  const [recipientCount, setRecipientCount] = useState(0);
  const [file, setFile] = useState(null);
  const [details, setDetails] = useState({
    name: '',
    channel: 'EMAIL',
    messageTemplate: '',
    chunkSize: 5000, // Updated default to enterprise scale
    rateLimitPerSecond: 10,
    scheduledAt: '',
  });

  const field = (key) => ({
    value: details[key],
    onChange: e => setDetails(d => ({ ...d, [key]: e.target.value })),
  });

  const inputCls = "w-full bg-app border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all";

  // Step 1: Create OR Update
  const handleCreateDraft = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (campaignId) {
        // We already created it. The user went back to edit settings. Hit the PUT endpoint!
        await api.updateSettings(campaignId, {
          chunkSize: Number(details.chunkSize),
          rateLimitPerSecond: Number(details.rateLimitPerSecond)
        });
        setStep(2);
      } else {
        // First time creating
        const data = await api.createCampaign({
          ...details,
          chunkSize: Number(details.chunkSize),
          rateLimitPerSecond: Number(details.rateLimitPerSecond),
          scheduledAt: details.scheduledAt ? new Date(details.scheduledAt).getTime() : null,
        });
        setCampaignId(data.id);
        setStep(2);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Upload CSV
  const handleUpload = async () => {
    if (!file && recipientCount === 0) { 
      setError('Select a CSV file first.'); 
      return; 
    }
    
    // If user didn't select a new file but we already have recipients, just skip to Step 3
    if (!file && recipientCount > 0) {
      setStep(3);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.uploadRecipients(campaignId, file);
      setRecipientCount(data.totalRecipients ?? 0);
      setFile(null); // Clear file state after successful upload
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Launch
  const handleLaunch = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.launchCampaign(campaignId);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="p-1.5 rounded-md text-muted hover:text-main hover:bg-border/40 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">New Campaign</h1>
      </div>

      <StepIndicator current={step} />

      {error && (
        <div className="bg-failed/10 border border-failed/30 text-failed text-sm px-4 py-3 rounded-md mb-5">
          {error}
        </div>
      )}

      {/* Step 1 — Details */}
      {step === 1 && (
        <form onSubmit={handleCreateDraft} className="bg-surface border border-border rounded-lg p-6 space-y-5 shadow-sm">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Campaign Name</label>
            <input required type="text" placeholder="e.g. Black Friday Blast" className={inputCls} {...field('name')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Channel</label>
              <select className={inputCls} {...field('channel')}>
                <option value="EMAIL">EMAIL</option>
                <option value="SMS">SMS</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Schedule (optional)</label>
              <input 
                type="datetime-local" 
                className={`${inputCls} font-mono`} 
                min={getMinDateTime()}
                {...field('scheduledAt')}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Message Template</label>
            <textarea
              required rows={4}
              placeholder={"Hello {name}, here's your exclusive offer…"}
              className={`${inputCls} font-mono resize-none`}
              {...field('messageTemplate')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-5">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Chunk Size (Rows per Worker)</label>
              <input type="number" min="1" className={`${inputCls} font-mono`} {...field('chunkSize')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Rate Limit / sec</label>
              <input type="number" min="1" className={`${inputCls} font-mono`} {...field('rateLimitPerSecond')} />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-5 py-2 rounded-md transition-colors disabled:opacity-50">
              {loading ? 'Saving…' : 'Next'} <ArrowRight size={16} />
            </button>
          </div>
        </form>
      )}

      {/* Step 2 — Recipients */}
      {step === 2 && (
        <div className="bg-surface border border-border rounded-lg p-6 space-y-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-semibold mb-1">Upload Recipients</h2>
              <p className="text-sm text-muted">
                CSV with <code className="font-mono bg-app px-1 py-0.5 rounded text-xs border border-border">contact</code> column required.
              </p>
            </div>
            
            {recipientCount > 0 && (
              <div className="flex items-center gap-2 bg-completed/10 text-completed text-sm px-3 py-1.5 rounded-md border border-completed/20">
                <CheckCircle2 size={16} />
                <span className="font-medium">{recipientCount.toLocaleString()} Loaded</span>
              </div>
            )}
          </div>

          <UploadDropzone file={file} onChange={f => { setFile(f); setError(null); }} />

          <div className="flex justify-between border-t border-border pt-4">
            <button onClick={() => setStep(1)}
              className="flex items-center gap-2 text-sm text-muted hover:text-main transition-colors px-3 py-2 rounded-md hover:bg-border/40">
              <ArrowLeft size={16} /> Back
            </button>
            <button onClick={handleUpload} disabled={loading || (!file && recipientCount === 0)}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-5 py-2 rounded-md transition-colors disabled:opacity-50">
              {loading ? 'Processing…' : (file ? 'Upload & Next' : 'Keep Existing & Continue')} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Review & Launch */}
      {step === 3 && (
        <div className="bg-surface border border-border rounded-lg p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-completed">
              <CheckCircle2 size={20} />
              <h2 className="font-semibold text-main">Ready to Launch</h2>
            </div>
            <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-accent transition-colors bg-app px-2.5 py-1.5 rounded border border-border">
              <Pencil size={12} /> Edit Settings
            </button>
          </div>

          <div className="bg-app border border-border rounded-md p-4 space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted mb-1">Campaign</p>
                <p className="font-medium text-main text-base wrap-break-word">{details.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Channel</p>
                <p className="font-mono bg-surface border border-border inline-block px-2 py-0.5 rounded text-xs">{details.channel}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-border pt-4">
              <div>
                <p className="text-xs text-muted mb-1">Total Recipients</p>
                <p className="font-mono font-medium flex items-center gap-1.5">
                  <FileSpreadsheet size={14} className="text-muted"/> {recipientCount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Worker Chunk Size</p>
                <p className="font-mono font-medium">{details.chunkSize}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Rate Limit</p>
                <p className="font-mono font-medium">{details.rateLimitPerSecond}/s</p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted mb-2 flex items-center justify-between">
                Message Template
              </p>
              <pre className="bg-surface border border-border p-3 rounded text-xs text-muted font-mono whitespace-pre-wrap break-words">
                {details.messageTemplate}
              </pre>
            </div>
          </div>

          <div className="flex justify-between border-t border-border pt-4">
            <button onClick={() => setStep(2)}
              className="flex items-center gap-2 text-sm text-muted hover:text-main transition-colors px-3 py-2 rounded-md hover:bg-border/40">
              <ArrowLeft size={16} /> Back
            </button>
            <button onClick={handleLaunch} disabled={loading}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium px-6 py-2.5 rounded-md transition-colors disabled:opacity-50 shadow-sm">
              {loading ? 'Launching…' : 'Launch Campaign'} <Rocket size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}