import YahooFinance from 'yahoo-finance2';
import { RANGES } from './ranges.js';

// The only module that talks to Yahoo Finance. It maps Yahoo responses to the provider contract:
//   fetchQuotes(symbols)          -> [{ symbol, price, previousClose }]
//   fetchHistory(symbol, rangeKey) -> [{ date: ISO string, close: number }]

let client;
const getClient = () => (client ??= new YahooFinance());

const isNumber = (n) => typeof n === 'number' && Number.isFinite(n);

/** Maps a Yahoo quote to the contract shape, or null when it has no usable price. */
export function mapQuote(q) {
  if (!q || !isNumber(q.regularMarketPrice)) return null;
  const price = q.regularMarketPrice;
  return {
    symbol: q.symbol,
    price,
    previousClose: isNumber(q.regularMarketPreviousClose) ? q.regularMarketPreviousClose : price,
  };
}

/** Maps a Yahoo chart result to [{ date, close }], dropping null bars (holidays, halts). */
export function mapChart(result, range) {
  let points = (result?.quotes ?? [])
    .filter((bar) => bar.date instanceof Date && isNumber(bar.close))
    .map((bar) => ({ date: bar.date.toISOString(), close: bar.close }));

  if (range.lastSessionOnly && points.length > 0) {
    const timeZone = result.meta?.exchangeTimezoneName ?? 'America/New_York';
    const dayOf = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone });
    const lastDay = dayOf(points[points.length - 1].date);
    points = points.filter((p) => dayOf(p.date) === lastDay);
  }
  return points;
}

export async function fetchQuotes(symbols) {
  const quotes = await getClient().quote(symbols);
  return quotes.map(mapQuote).filter(Boolean);
}

export async function fetchHistory(symbol, rangeKey) {
  const range = RANGES[rangeKey];
  if (!range) throw new Error(`Unknown range: ${rangeKey}`);

  const result = await getClient().chart(symbol, {
    period1: new Date(Date.now() - range.lookbackDays * 24 * 3600 * 1000),
    interval: range.interval,
    includePrePost: false, // regular trading hours only
  });
  const points = mapChart(result, range);
  if (points.length === 0) throw new Error(`No data available for ${symbol}`);
  return points;
}
