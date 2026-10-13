import { describe, it, expect } from 'vitest';
import { formatDateLabel, formatPercent, formatPrice } from './format.js';

describe('formatPrice', () => {
  it('formats USD with two decimals and thousands separators', () => {
    expect(formatPrice(1234.5)).toBe('$1,234.50');
    expect(formatPrice(-1.2)).toBe('-$1.20');
  });
});

describe('formatPercent', () => {
  it('adds a plus sign to positive values only', () => {
    expect(formatPercent(2.5)).toBe('+2.50%');
    expect(formatPercent(-2.5)).toBe('-2.50%');
    expect(formatPercent(0)).toBe('0.00%');
  });
});

describe('formatDateLabel', () => {
  it('uses New York market time regardless of the machine time zone', () => {
    // 14:30 UTC on 30 Jan 2025 is 09:30 in New York (EST).
    expect(formatDateLabel('2025-01-30T14:30:00Z', '1D')).toBe('09:30 AM');
    expect(formatDateLabel('2025-01-30T14:30:00Z', '7D')).toBe('Jan 30');
  });
});
