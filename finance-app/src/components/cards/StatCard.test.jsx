import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import StatCard from './StatCard.jsx';
import QuoteCard from './QuoteCard.jsx';

describe('StatCard', () => {
  it('renders label, value, detail and tone', () => {
    const html = renderToStaticMarkup(<StatCard label="Best" value="IBM +2.00%" detail="Leader" tone="up" />);
    expect(html).toContain('Best');
    expect(html).toContain('stat-value up');
    expect(html).toContain('IBM +2.00%');
    expect(html).toContain('Leader');
  });
});

describe('QuoteCard', () => {
  it('shows a down style for negative changes', () => {
    const quote = { symbol: 'IBM', name: 'IBM', price: 100, change: -1, changePercent: -1, color: '#000' };
    expect(renderToStaticMarkup(<QuoteCard quote={quote} />)).toContain('quote-change down');
  });
});
