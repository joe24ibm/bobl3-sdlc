import { describe, it, expect, vi } from 'vitest';
import * as mock from './providers/mockProvider.js';
import * as provider from './providers/index.js';
import {
  normalizeQuotes,
  normalizeHistory,
  buildComparisonSeries,
  getQuotes,
  getHistory,
  getComparisonSeries,
  summarizeSeries,
  rankByChange,
} from './financeService.js';

// Tests run against the deterministic mock provider, never the network.
vi.mock('./providers/index.js', async () => {
  const mockProvider = await import('./providers/mockProvider.js');
  return {
    fetchQuotes: vi.fn(mockProvider.fetchQuotes),
    fetchHistory: vi.fn(mockProvider.fetchHistory),
  };
});

describe('normalizeQuotes', () => {
  it('computes change and percent change and attaches company metadata', () => {
    const [quote] = normalizeQuotes([{ symbol: 'IBM', price: 110, previousClose: 100 }]);
    expect(quote).toMatchObject({ symbol: 'IBM', name: 'IBM', price: 110, change: 10, changePercent: 10 });
  });

  it('handles a zero or missing previous close', () => {
    expect(normalizeQuotes([{ symbol: 'IBM', price: 10, previousClose: 0 }])[0].changePercent).toBe(0);
    expect(normalizeQuotes([{ symbol: 'IBM', price: 10 }])[0].change).toBe(0);
  });

  it('drops quotes without a price and falls back to the symbol for unknown companies', () => {
    const quotes = normalizeQuotes([
      { symbol: 'IBM', price: null, previousClose: 1 },
      { symbol: 'XYZ', price: 5, previousClose: 5 },
    ]);
    expect(quotes).toHaveLength(1);
    expect(quotes[0].name).toBe('XYZ');
  });
});

describe('normalizeHistory', () => {
  it('drops invalid points, rounds closes and sorts by date', () => {
    const result = normalizeHistory([
      { date: '2025-01-02T00:00:00Z', close: 10.123 },
      { date: '2025-01-01T00:00:00Z', close: 9 },
      { date: '2025-01-03T00:00:00Z', close: null },
    ]);
    expect(result).toEqual([
      { date: '2025-01-01T00:00:00.000Z', close: 9 },
      { date: '2025-01-02T00:00:00.000Z', close: 10.12 },
    ]);
  });
});

describe('summarizeSeries / rankByChange', () => {
  const companies = [
    { symbol: 'A', name: 'Alpha', color: '#111' },
    { symbol: 'B', name: 'Beta', color: '#222' },
    { symbol: 'C', name: 'Gamma', color: '#333' },
  ];

  it('takes the last row, skips companies without data and keeps metadata', () => {
    const rows = [{ date: 'd1', A: 0, B: 0, C: null }, { date: 'd2', A: -2, B: 5, C: null }];
    expect(summarizeSeries(rows, companies)).toEqual([
      { symbol: 'A', name: 'Alpha', color: '#111', changePercent: -2 },
      { symbol: 'B', name: 'Beta', color: '#222', changePercent: 5 },
    ]);
  });

  it('returns an empty array for no rows', () => {
    expect(summarizeSeries([], companies)).toEqual([]);
  });

  it('ranks best performer first without mutating the input', () => {
    const items = [{ changePercent: -1 }, { changePercent: 3 }, { changePercent: 0 }];
    expect(rankByChange(items).map((i) => i.changePercent)).toEqual([3, 0, -1]);
    expect(items[0].changePercent).toBe(-1);
  });
});

describe('buildComparisonSeries', () => {
  it('expresses each series as percent change from its first point', () => {
    const rows = buildComparisonSeries({
      A: [{ date: 'd1', close: 100 }, { date: 'd2', close: 110 }],
      B: [{ date: 'd1', close: 50 }, { date: 'd2', close: 45 }],
    });
    expect(rows).toEqual([
      { date: 'd1', A: 0, B: 0 },
      { date: 'd2', A: 10, B: -10 },
    ]);
  });

  it('aligns by timestamp, carrying values forward and leaving nulls before a symbol starts', () => {
    const rows = buildComparisonSeries({
      A: [{ date: 'd1', close: 100 }, { date: 'd2', close: 110 }, { date: 'd3', close: 120 }],
      B: [{ date: 'd2', close: 50 }, { date: 'd3', close: 55 }],
    });
    expect(rows).toEqual([
      { date: 'd1', A: 0, B: null },
      { date: 'd2', A: 10, B: 0 },
      { date: 'd3', A: 20, B: 10 },
    ]);
  });

  it('returns an empty array for no input', () => {
    expect(buildComparisonSeries({})).toEqual([]);
  });
});

describe('service with mock provider', () => {
  it('returns quotes for all tracked companies', async () => {
    expect(await getQuotes()).toHaveLength(5);
  });

  it('returns normalized history for one symbol', async () => {
    const history = await getHistory('IBM', '1Q');
    expect(history).toHaveLength(63);
    expect(history[0]).toEqual({ date: expect.any(String), close: expect.any(Number) });
  });

  it('returns comparison rows for each range', async () => {
    for (const [range, length] of [['1D', 24], ['7D', 7], ['1Q', 63]]) {
      const rows = await getComparisonSeries(range);
      expect(rows).toHaveLength(length);
      expect(rows[0].IBM).toBe(0);
    }
  });

  it('works for a symbol that was not in the default list', async () => {
    const rows = await getComparisonSeries('7D', ['IBM', 'AAPL']);
    expect(Object.keys(rows[0])).toEqual(['date', 'IBM', 'AAPL']);
  });

  it('leaves out symbols that fail but still returns the rest', async () => {
    provider.fetchHistory.mockImplementationOnce(async (symbol) => {
      throw new Error(`no data for ${symbol}`);
    });
    const rows = await getComparisonSeries('7D', ['IBM', 'MSFT']);
    expect(Object.keys(rows[0])).toEqual(['date', 'MSFT']);
  });

  it('throws when every symbol fails', async () => {
    provider.fetchHistory.mockRejectedValue(new Error('upstream down'));
    await expect(getComparisonSeries('7D', ['IBM', 'MSFT'])).rejects.toThrow('upstream down');
    provider.fetchHistory.mockImplementation(mock.fetchHistory);
  });
});
