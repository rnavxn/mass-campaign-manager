const BAR_COLOR = {
  RUNNING:   'var(--status-running)',
  COMPLETED: 'var(--status-completed)',
  FAILED:    'var(--status-failed)',
  DRAFT:     'var(--status-draft)',
  SCHEDULED: 'var(--status-scheduled)',
};

export function ProgressBar({ value = 0, height = 4, showLabel = false }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  const color = BAR_COLOR[status] ?? 'var(--accent-primary)';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-app border border-border rounded-full overflow-hidden" style={{ height }}>
        <div
          style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.7s ease', borderRadius: '9999px' }}
        />
      </div>
      {showLabel && (
        <span className="font-mono text-xs text-muted min-w-[3ch] text-right">{pct}%</span>
      )}
    </div>
  );
}