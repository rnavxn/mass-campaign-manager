export function StatCard({ label, value, sub }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-5 py-4 flex-1 min-w-0">
      <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className="font-mono text-2xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}