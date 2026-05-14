export function ProgressBar({ value = 0, height = 4, showLabel = false }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-app border border-border rounded-full overflow-hidden" style={{ height }}>
        <div
          className="h-full bg-accent rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="font-mono text-xs text-muted min-w-[3ch] text-right">{pct}%</span>
      )}
    </div>
  );
}