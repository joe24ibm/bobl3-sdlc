import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import DashboardPage from './DashboardPage.jsx';
import * as service from '../services/financeService.js';
import { NoDataError } from '../services/errors.js';

// Keep the real ranking helpers; fake only the network-backed functions.
vi.mock('../services/financeService.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getQuotes: vi.fn(),
  getComparisonSeries: vi.fn(),
  getCompanySnapshot: vi.fn(),
}));

// jsdom has no layout, so Recharts' ResponsiveContainer renders nothing. Replace the chart
// components with markers that expose what they were given.
vi.mock('../components/charts/ComparisonLineChart.jsx', () => ({
  default: ({ data, companies }) => (
    <div data-testid="line-chart">{`${companies.map((c) => c.symbol).join(',')} | ${data.length} rows`}</div>
  ),
}));
vi.mock('../components/charts/PerformanceBarChart.jsx', () => ({
  default: ({ data }) => <div data-testid="bar-chart">{data.map((d) => d.name).join(',')}</div>,
}));

const QUOTES = [
  { symbol: 'IBM', name: 'IBM', color: '#0f62fe', price: 227.02, change: 0.5, changePercent: 0.22 },
  { symbol: 'MSFT', name: 'Microsoft', color: '#198038', price: 541.15, change: -6.1, changePercent: -1.1 },
];

const ROWS = [
  { date: '2025-01-30T15:00:00.000Z', IBM: 0, MSFT: 0 },
  { date: '2025-01-31T15:00:00.000Z', IBM: 2, MSFT: 5 },
];

const AAPL_SNAPSHOT = {
  quote: { symbol: 'AAPL', name: 'AAPL', color: '#ee5396', price: 340.97, change: 4.33, changePercent: 1.29 },
  rows: [{ date: '2025-01-30T15:00:00.000Z', AAPL: 0 }, { date: '2025-01-31T15:00:00.000Z', AAPL: 3 }],
};

beforeEach(() => {
  vi.resetAllMocks();
  service.getQuotes.mockResolvedValue(QUOTES);
  service.getComparisonSeries.mockResolvedValue(ROWS);
  service.getCompanySnapshot.mockResolvedValue(AAPL_SNAPSHOT);
});

describe('DashboardPage - current day view', () => {
  it('shows a loading state, then quote cards and charts', async () => {
    render(<DashboardPage />);
    expect(screen.getByText('Loading quotes…')).toBeTruthy();

    expect(await screen.findByText('$227.02')).toBeTruthy();
    expect(screen.getByText('$541.15')).toBeTruthy();
    expect(screen.getByText("Today's movers")).toBeTruthy();
    // Movers are ranked best first.
    expect(screen.getByTestId('bar-chart').textContent).toBe('IBM,Microsoft');
    await waitFor(() => expect(screen.getByTestId('line-chart').textContent).toBe('IBM,MSFT | 2 rows'));
    expect(service.getComparisonSeries).toHaveBeenCalledWith('1D');
  });

  it('shows an error message instead of crashing when quotes fail to load', async () => {
    service.getQuotes.mockRejectedValue(new Error('Yahoo is down'));
    render(<DashboardPage />);

    expect((await screen.findAllByText(/Yahoo is down/)).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('bar-chart')).toBeNull();
  });
});

describe('DashboardPage - comparison views', () => {
  it('switches to the 7-day view with headline stats and a ranking', async () => {
    render(<DashboardPage />);
    await screen.findByText('$227.02');

    fireEvent.click(screen.getByRole('tab', { name: 'Last 7 days' }));

    expect(await screen.findByText('Last 7 days trend')).toBeTruthy();
    expect(service.getComparisonSeries).toHaveBeenCalledWith('7D');

    const best = screen.getByText('Best performer').closest('article');
    expect(within(best).getByText('Microsoft')).toBeTruthy();
    expect(within(best).getByText('+5.00%')).toBeTruthy();

    const weakest = screen.getByText('Weakest').closest('article');
    expect(within(weakest).getByText('IBM')).toBeTruthy();

    const rank = screen.getByText('IBM rank').closest('article');
    expect(within(rank).getByText('#2 of 2')).toBeTruthy();

    expect(screen.getByTestId('bar-chart').textContent).toBe('Microsoft,IBM');
  });

  it('switches to the quarter view', async () => {
    render(<DashboardPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Last quarter' }));

    expect(await screen.findByText('Last quarter trend')).toBeTruthy();
    expect(service.getComparisonSeries).toHaveBeenCalledWith('1Q');
    expect(screen.getByRole('tab', { name: 'Last quarter' }).getAttribute('aria-selected')).toBe('true');
  });

  it('shows the error and no stat cards when the series fails to load', async () => {
    service.getComparisonSeries.mockRejectedValue(new Error('No data available'));
    render(<DashboardPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Last 7 days' }));

    // Both chart cards (trend + ranking) report the failure.
    expect(await screen.findAllByText(/No data available/)).toHaveLength(2);
    expect(screen.queryByText('Best performer')).toBeNull();
  });
});

describe('DashboardPage - user-selected company', () => {
  const lineCharts = () => screen.getAllByTestId('line-chart');
  const submit = (text) => {
    fireEvent.change(screen.getByLabelText('Check another company'), { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: 'Show chart' }));
  };

  it('shows no extra graph until a symbol is chosen', async () => {
    render(<DashboardPage />);
    await screen.findByText('$227.02');
    // No "<TICKER> performance" card (the existing "Intraday performance" card must not count).
    expect(screen.queryByText(/^[A-Z.^=-]+ performance$/)).toBeNull();
    expect(service.getCompanySnapshot).not.toHaveBeenCalled();
  });

  it('adds a graph for the chosen symbol and keeps the existing dashboard', async () => {
    render(<DashboardPage />);
    await screen.findByText('$227.02');

    submit('aapl');

    expect(await screen.findByText('AAPL performance')).toBeTruthy();
    expect(service.getCompanySnapshot).toHaveBeenCalledWith('AAPL', '1D');
    // Original dashboard still there, and its data calls did not change.
    expect(screen.getByText("Today's movers")).toBeTruthy();
    expect(screen.getByText('$541.15')).toBeTruthy();
    expect(service.getComparisonSeries).toHaveBeenCalledTimes(1);
    expect(service.getComparisonSeries).toHaveBeenCalledWith('1D');
    expect(service.getQuotes).toHaveBeenCalledTimes(1);
    expect(lineCharts().map((c) => c.textContent)).toContain('AAPL | 2 rows');
    expect(lineCharts().map((c) => c.textContent)).toContain('IBM,MSFT | 2 rows');
  });

  it('shows a clear message for an invalid symbol and fetches nothing', async () => {
    render(<DashboardPage />);
    await screen.findByText('$227.02');

    submit('bad sym!');

    expect(screen.getByRole('alert').textContent).toMatch(/not a valid ticker/i);
    expect(service.getCompanySnapshot).not.toHaveBeenCalled();
    expect(screen.getByText("Today's movers")).toBeTruthy();
  });

  it('shows a no-data message, with no other company standing in, and keeps the dashboard', async () => {
    service.getCompanySnapshot.mockRejectedValue(new NoDataError('No data available for ZZZZ'));
    render(<DashboardPage />);
    await screen.findByText('$227.02');

    submit('zzzz');

    const message = await screen.findByRole('status');
    expect(message.textContent).toMatch(/No data available for ZZZZ/);
    expect(screen.queryByText('ZZZZ performance')).toBeTruthy();
    expect(lineCharts().map((c) => c.textContent)).toEqual(['IBM,MSFT | 2 rows']);
    expect(screen.getByText("Today's movers")).toBeTruthy();
  });

  it('follows the range tab and leaves the comparison views working', async () => {
    render(<DashboardPage />);
    await screen.findByText('$227.02');
    submit('aapl');
    await screen.findByText('AAPL performance');

    fireEvent.click(screen.getByRole('tab', { name: 'Last 7 days' }));

    await waitFor(() => expect(service.getCompanySnapshot).toHaveBeenLastCalledWith('AAPL', '7D'));
    expect(await screen.findByText('Last 7 days trend')).toBeTruthy();
    expect(screen.getByText('AAPL performance')).toBeTruthy();
    expect(within(screen.getByText('Best performer').closest('article')).getByText('Microsoft')).toBeTruthy();
  });

  it('replaces the graph when another symbol is chosen and removes it on Clear', async () => {
    render(<DashboardPage />);
    await screen.findByText('$227.02');
    submit('aapl');
    await screen.findByText('AAPL performance');

    submit('nvda');
    expect(await screen.findByText('NVDA performance')).toBeTruthy();
    expect(screen.queryByText('AAPL performance')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Clear NVDA' }));
    expect(screen.queryByText('NVDA performance')).toBeNull();
    expect(screen.getByText("Today's movers")).toBeTruthy();
  });
});
