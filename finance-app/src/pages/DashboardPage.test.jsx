import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import DashboardPage from './DashboardPage.jsx';
import * as service from '../services/financeService.js';

// Keep the real ranking helpers; fake only the network-backed functions.
vi.mock('../services/financeService.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getQuotes: vi.fn(),
  getComparisonSeries: vi.fn(),
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

beforeEach(() => {
  vi.resetAllMocks();
  service.getQuotes.mockResolvedValue(QUOTES);
  service.getComparisonSeries.mockResolvedValue(ROWS);
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
