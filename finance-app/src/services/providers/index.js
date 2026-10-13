import * as mock from './mockProvider.js';
import * as http from './httpProvider.js';

// Selects the data source. Live Yahoo Finance data (via /api) is the default;
// set VITE_USE_MOCK=true to use deterministic offline data instead.
// Any provider must export fetchQuotes(symbols) and fetchHistory(symbol, rangeKey).
const provider = import.meta.env?.VITE_USE_MOCK === 'true' ? mock : http;

export const { fetchQuotes, fetchHistory } = provider;
