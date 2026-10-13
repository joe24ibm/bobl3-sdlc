import { formatPercent, formatPrice } from '../../utils/format.js';

/** Compact summary tile for one company's quote. */
export default function QuoteCard({ quote }) {
  const direction = quote.change >= 0 ? 'up' : 'down';
  return (
    <article className="card quote-card" style={{ borderTopColor: quote.color }}>
      <h3>{quote.name}</h3>
      <span className="muted">{quote.symbol}</span>
      <p className="quote-price">{formatPrice(quote.price)}</p>
      <p className={`quote-change ${direction}`}>
        {formatPrice(quote.change)} ({formatPercent(quote.changePercent)})
      </p>
    </article>
  );
}
