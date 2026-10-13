import { COMPANIES, SELECTED_COMPANY_COLOR } from '../config/companies.js';
import { NoDataError } from './errors.js';
import * as provider from './providers/index.js';

// Public data API used by hooks/components. UI code must only import from here.
// Providers return raw data (see providers/); this module normalizes it for the UI.
// Which companies are tracked comes from config/companies.js, so adding one needs no change here.

const round = (n) => Math.round(n * 100) / 100;
const isNumber = (n) => typeof n === 'number' && Number.isFinite(n);
const defaultSymbols = () => COMPANIES.map((c) => c.symbol);

/** Normalizes raw provider quotes into the shape the UI consumes. Rows without a price are dropped. */
export function normalizeQuotes(rawQuotes, companies = COMPANIES) {
  return rawQuotes
    .filter((q) => isNumber(q.price))
    .map(({ symbol, price, previousClose }) => {
      const company = companies.find((c) => c.symbol === symbol);
      const change = isNumber(previousClose) ? round(price - previousClose) : 0;
      return {
        symbol,
        name: company?.name ?? symbol,
        color: company?.color,
        price: round(price),
        change,
        changePercent: previousClose ? round((change / previousClose) * 100) : 0,
      };
    });
}

/** Cleans a raw history: drops bad points, rounds prices, sorts oldest to newest. */
export function normalizeHistory(rawHistory) {
  return rawHistory
    .filter((p) => p?.date && isNumber(p.close))
    .map((p) => ({ date: new Date(p.date).toISOString(), close: round(p.close) }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * Merges per-symbol histories into chart rows, expressed as % change from each series' start
 * so companies with different price levels can be compared on one axis.
 * Rows are aligned by timestamp; a symbol missing a bar carries its previous value forward
 * (null before its first bar). Result: [{ date, IBM: 0, MSFT: 0.4, ... }]
 */
export function buildComparisonSeries(historyBySymbol) {
  const series = Object.entries(historyBySymbol).map(([symbol, points]) => ({
    symbol,
    byDate: new Map(points.map((p) => [p.date, p.close])),
    base: points[0]?.close,
    last: null,
  }));
  const dates = [...new Set(Object.values(historyBySymbol).flatMap((pts) => pts.map((p) => p.date)))].sort();

  return dates.map((date) => {
    const row = { date };
    series.forEach((s) => {
      if (s.byDate.has(date)) s.last = s.byDate.get(date);
      row[s.symbol] = s.last !== null && s.base ? round(((s.last - s.base) / s.base) * 100) : null;
    });
    return row;
  });
}

/**
 * Period result per company from comparison rows (the last row), e.g. for ranking charts.
 * Only companies that have data are returned: [{ symbol, name, color, changePercent }]
 */
export function summarizeSeries(rows, companies = COMPANIES) {
  const last = rows[rows.length - 1];
  if (!last) return [];
  return companies
    .filter((c) => Number.isFinite(last[c.symbol]))
    .map(({ symbol, name, color }) => ({ symbol, name, color, changePercent: last[symbol] }));
}

/** Best performer first. Works on quotes and on summarizeSeries output. */
export function rankByChange(items) {
  return [...items].sort((a, b) => b.changePercent - a.changePercent);
}

export async function getQuotes(symbols = defaultSymbols()) {
  return normalizeQuotes(await provider.fetchQuotes(symbols));
}

/** Normalized absolute-price history for one symbol: [{ date, close }]. */
export async function getHistory(symbol, rangeKey) {
  return normalizeHistory(await provider.fetchHistory(symbol, rangeKey));
}

/**
 * Data for one user-chosen company: its quote and its % change series for the range.
 * Strictly that symbol: if the source has no quote or no history for it, this throws
 * NoDataError. It never substitutes another company's data. Other failures (network,
 * rate limit) are rethrown as they are.
 * Result: { quote, rows } where rows look like [{ date, <SYMBOL>: 0, ... }].
 */
export async function getCompanySnapshot(symbol, rangeKey) {
  const [rawQuotes, history] = await Promise.all([
    provider.fetchQuotes([symbol]),
    getHistory(symbol, rangeKey),
  ]);
  const [quote] = normalizeQuotes(rawQuotes);
  if (!quote || history.length === 0) throw new NoDataError(`No data available for ${symbol}`);

  return {
    quote: { ...quote, color: quote.color ?? SELECTED_COMPANY_COLOR },
    rows: buildComparisonSeries({ [symbol]: history }),
  };
}

/**
 * Comparison rows for a range. A symbol that fails to load is left out so the rest still render;
 * the call only fails when every symbol fails.
 */
export async function getComparisonSeries(rangeKey, symbols = defaultSymbols()) {
  const results = await Promise.allSettled(symbols.map((symbol) => getHistory(symbol, rangeKey)));
  const historyBySymbol = {};
  results.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value.length > 0) historyBySymbol[symbols[i]] = result.value;
  });

  if (Object.keys(historyBySymbol).length === 0 && symbols.length > 0) {
    const failure = results.find((r) => r.status === 'rejected');
    throw failure?.reason ?? new Error('No market data available');
  }
  return buildComparisonSeries(historyBySymbol);
}
