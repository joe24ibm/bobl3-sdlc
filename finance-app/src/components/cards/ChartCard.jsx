/** Generic card frame for any chart: title, optional subtitle, loading/error states. */
export default function ChartCard({ title, subtitle, loading, error, children }) {
  return (
    <section className="card chart-card">
      <header className="card-header">
        <h2>{title}</h2>
        {subtitle && <span className="muted">{subtitle}</span>}
      </header>
      <div className="card-body">
        {loading && <p className="muted">Loading…</p>}
        {error && <p className="error">Failed to load data: {error.message}</p>}
        {!loading && !error && children}
      </div>
    </section>
  );
}
