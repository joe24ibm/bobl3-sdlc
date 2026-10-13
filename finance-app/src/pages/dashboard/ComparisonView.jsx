import ChartCard from '../../components/cards/ChartCard.jsx';
import StatCard from '../../components/cards/StatCard.jsx';
import ComparisonLineChart from '../../components/charts/ComparisonLineChart.jsx';
import PerformanceBarChart from '../../components/charts/PerformanceBarChart.jsx';
import { FOCUS_SYMBOL } from '../../config/companies.js';
import { useAsyncData } from '../../hooks/useAsyncData.js';
import { getComparisonSeries, rankByChange, summarizeSeries } from '../../services/financeService.js';
import { formatPercent } from '../../utils/format.js';

const COPY = {
  '7D': { trendTitle: 'Last 7 days trend', trendSubtitle: '% change from start of week', rankTitle: '7-day ranking' },
  '1Q': { trendTitle: 'Last quarter trend', trendSubtitle: '% change from start of quarter', rankTitle: 'Quarter ranking' },
};

const toneOf = (n) => (n >= 0 ? 'up' : 'down');

/** Trend comparison for a multi-day range (7D, 1Q): headline stats, trend lines and a ranking. */
export default function ComparisonView({ rangeKey }) {
  const copy = COPY[rangeKey];
  const series = useAsyncData(() => getComparisonSeries(rangeKey), [rangeKey]);

  const ranking = series.data ? rankByChange(summarizeSeries(series.data)) : [];
  const best = ranking[0];
  const worst = ranking[ranking.length - 1];
  const focusIndex = ranking.findIndex((c) => c.symbol === FOCUS_SYMBOL);

  return (
    <>
      {ranking.length > 0 && (
        <section className="stat-grid">
          <StatCard label="Best performer" value={best.name} detail={formatPercent(best.changePercent)} tone={toneOf(best.changePercent)} />
          <StatCard label="Weakest" value={worst.name} detail={formatPercent(worst.changePercent)} tone={toneOf(worst.changePercent)} />
          {focusIndex >= 0 && (
            <StatCard
              label={`${FOCUS_SYMBOL} rank`}
              value={`#${focusIndex + 1} of ${ranking.length}`}
              detail={formatPercent(ranking[focusIndex].changePercent)}
              tone={toneOf(ranking[focusIndex].changePercent)}
            />
          )}
        </section>
      )}

      <div className="chart-grid wide-left">
        <ChartCard title={copy.trendTitle} subtitle={copy.trendSubtitle} loading={series.loading} error={series.error}>
          <ComparisonLineChart data={series.data ?? []} companies={ranking} rangeKey={rangeKey} />
        </ChartCard>

        <ChartCard title={copy.rankTitle} subtitle="Total % change" loading={series.loading} error={series.error}>
          <PerformanceBarChart data={ranking} />
        </ChartCard>
      </div>
    </>
  );
}
