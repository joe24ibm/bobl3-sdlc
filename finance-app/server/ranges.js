// Yahoo-specific query parameters per dashboard time range.
// Keys must match TIME_RANGES in src/config/companies.js.
export const RANGES = {
  // Current day: 5-minute bars; look back a few days so weekends/holidays still show the last session.
  '1D': { interval: '5m', lookbackDays: 5, lastSessionOnly: true },
  '7D': { interval: '1h', lookbackDays: 7 },
  '1Q': { interval: '1d', lookbackDays: 92 },
};
