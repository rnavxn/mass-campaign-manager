const STATUS_STYLES = {
  RUNNING:   'text-running border-running/30 bg-running/10',
  COMPLETED: 'text-completed border-completed/30 bg-completed/10',
  FAILED:    'text-failed border-failed/30 bg-failed/10',
  DRAFT:     'text-draft border-draft/30 bg-draft/10',
  SCHEDULED: 'text-scheduled border-scheduled/30 bg-scheduled/10',
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-medium px-2.5 py-1 rounded border ${STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT}`}>
      <span
        className="w-1.5 h-1.5 rounded-full bg-current shrink-0"
        style={status === 'RUNNING' ? { animation: 'pulse-dot 1.4s ease-in-out infinite' } : {}}
      />
      {status}
    </span>
  );
}