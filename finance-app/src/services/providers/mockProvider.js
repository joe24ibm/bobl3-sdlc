import { TIME_RANGES } from '../../config/companies.js';

// Deterministic mock data so the UI, tests and demos are stable.
// Replace with a Yahoo Finance provider exposing the same two functions.

const BASE_PRICES = { IBM: 190, MSFT: 420, ORCL: 125, SAP: 190, CRM: 270 };

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str) {
  return [...str].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 2147483647, 7);
}

/** Returns raw [{ date: ISO string, close: number }] for a symbol and range key. */
export async function fetchHistory(symbol, rangeKey) {
  const range = TIME_RANGES.find((r) => r.key === rangeKey);
  if (!range) throw new Error(`Unknown range: ${rangeKey}`);

  const rand = seededRandom(hashString(`${symbol}:${rangeKey}`));
  const stepMs = rangeKey === '1D' ? 3600e3 : 86400e3;
  const end = Date.UTC(2025, 0, 31, 21, 0, 0);
  let price = BASE_PRICES[symbol] ?? 100;

  return Array.from({ length: range.points }, (_, i) => {
    price *= 1 + (rand() - 0.48) * 0.02;
    return {
      date: new Date(end - (range.points - 1 - i) * stepMs).toISOString(),
      close: Number(price.toFixed(2)),
    };
  });
}

/** Returns raw [{ symbol, price, previousClose }] for the given symbols. */
export async function fetchQuotes(symbols) {
  return Promise.all(
    symbols.map(async (symbol) => {
      const history = await fetchHistory(symbol, '7D');
      const last = history[history.length - 1].close;
      const prev = history[history.length - 2].close;
      return { symbol, price: last, previousClose: prev };
    }),
  );
}
