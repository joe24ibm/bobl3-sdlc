// Browser-side provider: talks to the /api endpoints served by server/apiMiddleware.js.
import { NoDataError } from '../errors.js';

async function getJson(path, params) {
  const res = await fetch(`/api/${path}?${new URLSearchParams(params)}`);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body?.error?.message ?? `Request failed (${res.status})`;
    if (body?.error?.code === 'NO_DATA') throw new NoDataError(message);
    throw new Error(message);
  }
  return body;
}

export const fetchQuotes = (symbols) => getJson('quotes', { symbols: symbols.join(',') });

export const fetchHistory = (symbol, rangeKey) => getJson('history', { symbol, range: rangeKey });
