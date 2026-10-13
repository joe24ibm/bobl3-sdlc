/** Headline metric tile. `tone` ('up' | 'down') colors the value. */
export default function StatCard({ label, value, detail, tone }) {
  return (
    <article className="card stat-card">
      <span className="muted">{label}</span>
      <p className={`stat-value ${tone ?? ''}`}>{value}</p>
      {detail && <span className="muted">{detail}</span>}
    </article>
  );
}
