// Same rule the server enforces (server/apiMiddleware.js): 1-15 chars of A-Z 0-9 . ^ = -
const SYMBOL_PATTERN = /^[A-Z0-9.^=-]{1,15}$/;

/**
 * Normalizes and validates user input for a ticker symbol.
 * Returns { symbol } when valid, or { error } with a message fit to show the user.
 */
export function parseSymbol(input) {
  const symbol = (input ?? '').trim().toUpperCase();
  if (!symbol) return { error: 'Enter a ticker symbol, for example AAPL.' };
  if (!SYMBOL_PATTERN.test(symbol)) {
    return { error: `"${symbol}" is not a valid ticker. Use letters, numbers, and . - ^ = only (max 15).` };
  }
  return { symbol };
}
