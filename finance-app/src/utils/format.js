export const formatPrice = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export const formatPercent = (n) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;

// US-listed tickers, so chart labels use New York market time.
const MARKET_TZ = 'America/New_York';

export const formatDateLabel = (iso, rangeKey) => {
  const d = new Date(iso);
  return rangeKey === '1D'
    ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: MARKET_TZ })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: MARKET_TZ });
};
