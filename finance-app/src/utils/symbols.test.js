import { describe, it, expect } from 'vitest';
import { parseSymbol } from './symbols.js';

describe('parseSymbol', () => {
  it('trims and upper-cases valid input', () => {
    expect(parseSymbol('  aapl ')).toEqual({ symbol: 'AAPL' });
    expect(parseSymbol('brk-b')).toEqual({ symbol: 'BRK-B' });
    expect(parseSymbol('^gspc')).toEqual({ symbol: '^GSPC' });
    expect(parseSymbol('bayn.de')).toEqual({ symbol: 'BAYN.DE' });
  });

  it('rejects empty and whitespace-only input with a hint', () => {
    expect(parseSymbol('').error).toMatch(/enter a ticker/i);
    expect(parseSymbol('   ').error).toMatch(/enter a ticker/i);
    expect(parseSymbol(undefined).error).toMatch(/enter a ticker/i);
  });

  it('rejects characters the API does not accept, quoting what was typed', () => {
    expect(parseSymbol('bad sym!').error).toContain('"BAD SYM!"');
    expect(parseSymbol('a,b').error).toMatch(/not a valid ticker/i);
    expect(parseSymbol('<script>').error).toMatch(/not a valid ticker/i);
  });

  it('rejects symbols longer than 15 characters', () => {
    expect(parseSymbol('A'.repeat(15)).symbol).toBe('A'.repeat(15));
    expect(parseSymbol('A'.repeat(16)).error).toMatch(/max 15/);
  });
});
