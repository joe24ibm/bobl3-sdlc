import ChartCard from '../../components/cards/ChartCard.jsx';
import QuoteCard from '../../components/cards/QuoteCard.jsx';
import ComparisonLineChart from '../../components/charts/ComparisonLineChart.jsx';
import { TIME_RANGES } from '../../config/companies.js';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import { getCompanySnapshot } from '../../services/financeService.js';

/**
 * The extra graph for the company the user chose. Independent of the IBM-vs-competitors views:
 * it fetches only its own symbol and shows a clear message if that symbol has no data.
 */
export default function SelectedCompanyView({ symbol, rangeKey }) {
  const rangeLabel = TIME_RANGES.find((r) => r.key === rangeKey).label;
  const snapshot = useAsyncData(() => getCompanySnapshot(symbol, rangeKey), [symbol, rangeKey]);

  const noData = snapshot.error?.code === 'NO_DATA';
  const title = `${symbol} performance`;

  if (noData) {
    return (
      <section className="card chart-card" aria-label={title}>
        <header className="card-header">
          <h2>{title}</h2>
        </header>
        <p role="status" className="no-data">
          No data available for {symbol}. Check the ticker symbol and try another one.
        </p>
      </section>
    );
  }

  const quote = snapshot.data?.quote;
  return (
    <div className="selected-company">
      {quote && <QuoteCard quote={quote} />}
      <ChartCard
        title={title}
        subtitle={`${rangeLabel} · % change from start of period`}
        loading={snapshot.loading}
        error={snapshot.error}
      >
        {snapshot.data && (
          <ComparisonLineChart
            data={snapshot.data.rows}
            companies={[{ symbol, name: quote.name, color: quote.color }]}
            rangeKey={rangeKey}
          />
        )}
      </ChartCard>
    </div>
  );
}
