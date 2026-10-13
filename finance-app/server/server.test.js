import { describe, it, expect, vi } from 'vitest';
import { mapChart, mapQuote, NoDataError } from './yahooClient.js';
import { createApiMiddleware } from './apiMiddleware.js';
import { RANGES } from './ranges.js';
import { TIME_RANGES } from '../src/config/companies.js';

describe('mapQuote', () => {
  it('maps a Yahoo quote to the provider contract', () => {
    expect(mapQuote({ symbol: 'IBM', regularMarketPrice: 200, regularMarketPreviousClose: 198 })).toEqual({
      symbol: 'IBM',
      price: 200,
      previousClose: 198,
    });
  });

  it('falls back to price when previous close is missing', () => {
    expect(mapQuote({ symbol: 'IBM', regularMarketPrice: 200 }).previousClose).toBe(200);
  });

  it('returns null when there is no price', () => {
    expect(mapQuote({ symbol: 'IBM' })).toBeNull();
  });
});

describe('mapChart', () => {
  const meta = { exchangeTimezoneName: 'America/New_York' };
  const bar = (iso, close) => ({ date: new Date(iso), close });

  it('drops bars with null closes', () => {
    const result = { meta, quotes: [bar('2025-01-30T15:00:00Z', 100), bar('2025-01-31T15:00:00Z', null)] };
    expect(mapChart(result, RANGES['7D'])).toEqual([{ date: '2025-01-30T15:00:00.000Z', close: 100 }]);
  });

  it('keeps only the last trading session for the current-day range', () => {
    const result = {
      meta,
      quotes: [bar('2025-01-30T15:00:00Z', 1), bar('2025-01-31T15:00:00Z', 2), bar('2025-01-31T16:00:00Z', 3)],
    };
    expect(mapChart(result, RANGES['1D']).map((p) => p.close)).toEqual([2, 3]);
  });

  it('returns an empty array for an empty result', () => {
    expect(mapChart({ meta, quotes: [] }, RANGES['1D'])).toEqual([]);
  });
});

describe('RANGES', () => {
  it('covers every client time range', () => {
    expect(Object.keys(RANGES).sort()).toEqual(TIME_RANGES.map((r) => r.key).sort());
  });
});

describe('createApiMiddleware', () => {
  function call(middleware, url) {
    return new Promise((resolve) => {
      const res = {
        headers: {},
        setHeader(k, v) { this.headers[k] = v; },
        end(body) { resolve({ status: this.statusCode, body: JSON.parse(body) }); },
      };
      middleware({ url }, res, () => resolve({ status: 'next' }));
    });
  }

  const makeClient = () => ({
    fetchQuotes: vi.fn(async (symbols) => symbols.map((symbol) => ({ symbol, price: 1, previousClose: 1 }))),
    fetchHistory: vi.fn(async () => [{ date: '2025-01-31T00:00:00.000Z', close: 1 }]),
  });

  it('serves quotes and normalizes the symbol list', async () => {
    const client = makeClient();
    const { status, body } = await call(createApiMiddleware(client), '/api/quotes?symbols=ibm,%20msft,ibm');
    expect(status).toBe(200);
    expect(body.map((q) => q.symbol)).toEqual(['IBM', 'MSFT']);
    expect(client.fetchQuotes).toHaveBeenCalledWith(['IBM', 'MSFT']);
  });

  it('serves history', async () => {
    const { status, body } = await call(createApiMiddleware(makeClient()), '/api/history?symbol=IBM&range=1Q');
    expect(status).toBe(200);
    expect(body).toHaveLength(1);
  });

  it('rejects invalid symbols and ranges with 400', async () => {
    const mw = createApiMiddleware(makeClient());
    expect((await call(mw, '/api/quotes?symbols=')).status).toBe(400);
    expect((await call(mw, '/api/quotes?symbols=bad%20sym!')).status).toBe(400);
    expect((await call(mw, '/api/history?symbol=IBM&range=5Y')).status).toBe(400);
    expect((await call(mw, '/api/history?symbol=IBM&range=constructor')).status).toBe(400);
  });

  it('maps provider failures to 502 and does not cache them', async () => {
    const client = makeClient();
    client.fetchHistory.mockRejectedValueOnce(new Error('boom'));
    const mw = createApiMiddleware(client);
    const failed = await call(mw, '/api/history?symbol=IBM&range=7D');
    expect(failed.status).toBe(502);
    expect(failed.body.error.message).toBe('boom');
    expect((await call(mw, '/api/history?symbol=IBM&range=7D')).status).toBe(200);
  });

  it('caches responses within the TTL', async () => {
    const client = makeClient();
    let t = 0;
    const mw = createApiMiddleware(client, { ttlMs: 1000, now: () => t });
    await call(mw, '/api/quotes?symbols=IBM');
    await call(mw, '/api/quotes?symbols=IBM');
    expect(client.fetchQuotes).toHaveBeenCalledTimes(1);
    t = 2000;
    await call(mw, '/api/quotes?symbols=IBM');
    expect(client.fetchQuotes).toHaveBeenCalledTimes(2);
  });

  it('passes non-API requests through', async () => {
    expect((await call(createApiMiddleware(makeClient()), '/index.html')).status).toBe('next');
  });

  it('returns 404 for unknown API endpoints', async () => {
    expect((await call(createApiMiddleware(makeClient()), '/api/nope')).status).toBe(404);
  });
});

describe('no-data handling', () => {
  function call(middleware, url) {
    return new Promise((resolve) => {
      const res = {
        setHeader() {},
        end(body) { resolve({ status: this.statusCode, body: JSON.parse(body) }); },
      };
      middleware({ url }, res, () => resolve({ status: 'next' }));
    });
  }

  it('maps a NO_DATA error to 404 with a NO_DATA code, not a generic 502', async () => {
    const client = {
      fetchQuotes: vi.fn(),
      fetchHistory: vi.fn(async () => {
        throw new NoDataError('ZZZZ');
      }),
    };
    const { status, body } = await call(createApiMiddleware(client), '/api/history?symbol=ZZZZ&range=7D');
    expect(status).toBe(404);
    expect(body.error).toEqual({ code: 'NO_DATA', message: 'No data available for ZZZZ' });
  });

  it('returns an empty list from /api/quotes for an unknown symbol', async () => {
    const client = { fetchQuotes: vi.fn(async () => []), fetchHistory: vi.fn() };
    const { status, body } = await call(createApiMiddleware(client), '/api/quotes?symbols=ZZZZ');
    expect(status).toBe(200);
    expect(body).toEqual([]);
  });
});
