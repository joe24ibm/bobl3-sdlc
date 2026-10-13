import ChartCard from '../../components/cards/ChartCard.jsx';
import QuoteCard from '../../components/cards/QuoteCard.jsx';
import ComparisonLineChart from '../../components/charts/ComparisonLineChart.jsx';
import PerformanceBarChart from '../../components/charts/PerformanceBarChart.jsx';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import { getComparisonSeries, getQuotes, rankByChange, summarizeSeries } from '../../services/financeService.js';

/** Current day market summary: quote cards, today's movers and the intraday curve. */
export default function TodayView() {
  const quotes = useAsyncData(() => getQuotes(), []);
  const series = useAsyncData(() => getComparisonSeries('1D'), []);

  const movers = quotes.data ? rankByChange(quotes.data) : [];
  const lines = series.data ? summarizeSeries(series.data) : [];

  return (
    <>
      <section className="quote-grid">
        {quotes.loading && <p className="muted">Loading quotes…</p>}
        {quotes.error && <p className="error">Failed to load quotes: {quotes.error.message}</p>}
        {quotes.data?.map((quote) => <QuoteCard key={quote.symbol} quote={quote} />)}
      </section>

      <div className="chart-grid even">
        <ChartCard
          title="Today's movers"
          subtitle="% change vs. previous close"
          loading={quotes.loading}
          error={quotes.error}
        >
          <PerformanceBarChart data={movers} />
        </ChartCard>

        <ChartCard
          title="Intraday performance"
          subtitle="Latest session · % change since open"
          loading={series.loading}
          error={series.error}
        >
          <ComparisonLineChart data={series.data ?? []} companies={lines} rangeKey="1D" />
        </ChartCard>
      </div>
    </>
  );
}
