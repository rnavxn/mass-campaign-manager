const STYLES = {
  PENDING:    'text-draft border-draft/30 bg-draft/10',
  PROCESSING: 'text-running border-running/30 bg-running/10',
  COMPLETED:  'text-completed border-completed/30 bg-completed/10',
  FAILED:     'text-failed border-failed/30 bg-failed/10',
};

export function ChunkBadge({ status }) {
  return (
    <span className={`font-mono text-[10px] font-medium px-2 py-0.5 rounded border ${STYLES[status] ?? STYLES.PENDING}`}>
      {status}
    </span>
  );
}