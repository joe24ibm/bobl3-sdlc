import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SelectedCompanyView from './SelectedCompanyView.jsx';
import * as service from '../../services/financeService.js';
import { NoDataError } from '../../services/errors.js';

vi.mock('../../services/financeService.js', () => ({ getCompanySnapshot: vi.fn() }));

// jsdom has no layout, so stand in for the Recharts chart and expose what it receives.
vi.mock('../../components/charts/ComparisonLineChart.jsx', () => ({
  default: ({ data, companies }) => (
    <div data-testid="line-chart">{`${companies.map((c) => c.symbol).join(',')} | ${data.length} rows`}</div>
  ),
}));

const SNAPSHOT = {
  quote: { symbol: 'AAPL', name: 'AAPL', color: '#ee5396', price: 340.97, change: 4.33, changePercent: 1.29 },
  rows: [{ date: '2025-01-30T15:00:00.000Z', AAPL: 0 }, { date: '2025-01-31T15:00:00.000Z', AAPL: 3 }],
};

beforeEach(() => vi.resetAllMocks());

describe('SelectedCompanyView', () => {
  it('shows a loading state, then the quote and the graph for that symbol', async () => {
    service.getCompanySnapshot.mockResolvedValue(SNAPSHOT);
    render(<SelectedCompanyView symbol="AAPL" rangeKey="7D" />);
    expect(screen.getByText('Loading…')).toBeTruthy();

    expect(await screen.findByText('$340.97')).toBeTruthy();
    expect(screen.getByText('AAPL performance')).toBeTruthy();
    expect(screen.getByTestId('line-chart').textContent).toBe('AAPL | 2 rows');
    expect(service.getCompanySnapshot).toHaveBeenCalledWith('AAPL', '7D');
  });

  it('shows a clear no-data message, and no chart or quote, when the symbol has no data', async () => {
    service.getCompanySnapshot.mockRejectedValue(new NoDataError('No data available for ZZZZ'));
    render(<SelectedCompanyView symbol="ZZZZ" rangeKey="7D" />);

    const message = await screen.findByRole('status');
    expect(message.textContent).toMatch(/No data available for ZZZZ/);
    expect(screen.queryByTestId('line-chart')).toBeNull();
    expect(screen.queryByText(/\$/)).toBeNull();
  });

  it('shows other failures as an error, not as a no-data message', async () => {
    service.getCompanySnapshot.mockRejectedValue(new Error('Yahoo is rate limiting'));
    render(<SelectedCompanyView symbol="AAPL" rangeKey="7D" />);

    expect(await screen.findByText(/Yahoo is rate limiting/)).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByTestId('line-chart')).toBeNull();
  });

  it('reloads for the new range when the range changes', async () => {
    service.getCompanySnapshot.mockResolvedValue(SNAPSHOT);
    const { rerender } = render(<SelectedCompanyView symbol="AAPL" rangeKey="7D" />);
    await screen.findByText('$340.97');

    rerender(<SelectedCompanyView symbol="AAPL" rangeKey="1Q" />);
    await screen.findByText(/Last quarter/);
    expect(service.getCompanySnapshot).toHaveBeenLastCalledWith('AAPL', '1Q');
  });
});
