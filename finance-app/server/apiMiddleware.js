import { RANGES } from './ranges.js';

// Connect-style middleware exposing:
//   GET /api/quotes?symbols=IBM,MSFT
//   GET /api/history?symbol=IBM&range=7D
// `client` must implement the provider contract (see yahooClient.js).
// Responses are cached briefly to avoid hammering Yahoo and to dedupe concurrent requests.

const SYMBOL_PATTERN = /^[A-Z0-9.^=-]{1,15}$/;
const MAX_SYMBOLS = 10;

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function parseSymbols(raw) {
  const symbols = [...new Set((raw ?? '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))];
  if (symbols.length === 0 || symbols.length > MAX_SYMBOLS || !symbols.every((s) => SYMBOL_PATTERN.test(s))) {
    throw new HttpError(400, 'BAD_REQUEST', `Provide 1-${MAX_SYMBOLS} valid symbols`);
  }
  return symbols;
}

export function createApiMiddleware(client, { ttlMs = 60_000, now = Date.now } = {}) {
  const cache = new Map();

  function cached(key, load) {
    const hit = cache.get(key);
    if (hit && hit.expires > now()) return hit.promise;
    const promise = load();
    cache.set(key, { promise, expires: now() + ttlMs });
    promise.catch(() => cache.delete(key));
    return promise;
  }

  function route(url) {
    if (url.pathname === '/api/quotes') {
      const symbols = parseSymbols(url.searchParams.get('symbols'));
      return cached(`q:${symbols.join(',')}`, () => client.fetchQuotes(symbols));
    }
    if (url.pathname === '/api/history') {
      const [symbol] = parseSymbols(url.searchParams.get('symbol'));
      const range = url.searchParams.get('range');
      if (!Object.hasOwn(RANGES, range)) throw new HttpError(400, 'BAD_REQUEST', `Unknown range: ${range}`);
      return cached(`h:${symbol}:${range}`, () => client.fetchHistory(symbol, range));
    }
    return null;
  }

  return async function apiMiddleware(req, res, next) {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return next();

    const send = (status, body) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    };

    try {
      const pending = route(url);
      if (!pending) return send(404, { error: { code: 'NOT_FOUND', message: 'Unknown endpoint' } });
      send(200, await pending);
    } catch (err) {
      if (err instanceof HttpError) return send(err.status, { error: { code: err.code, message: err.message } });
      send(502, { error: { code: 'UPSTREAM_ERROR', message: err.message || 'Market data provider failed' } });
    }
  };
}
