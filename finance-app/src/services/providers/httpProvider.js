// Browser-side provider: talks to the /api endpoints served by server/apiMiddleware.js.

async function getJson(path, params) {
  const res = await fetch(`/api/${path}?${new URLSearchParams(params)}`);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  return body;
}

export const fetchQuotes = (symbols) => getJson('quotes', { symbols: symbols.join(',') });

export const fetchHistory = (symbol, rangeKey) => getJson('history', { symbol, range: rangeKey });
