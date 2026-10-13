# finance-app

React + Vite dashboard comparing IBM with major competitors.

## Commands

Run these from the `finance-app` folder:

```bash
npm install
npm run dev
```

- `npm run dev` starts the dev server with live Yahoo Finance data (needs Node 22+).
- `VITE_USE_MOCK=true npm run dev` uses offline, deterministic mock data instead.
- `npm test` runs the unit tests. They never hit the network.
- `npm run build` creates the production build.

## Validation

Run everything with one command:

```bash
npm run check
```

It runs lint, then tests, then the build, and stops at the first failure. Each check can also be run on its own:

- `npm run lint` runs ESLint (React and hooks rules).
- `npm test` runs Vitest (68 tests, no network access).
- `npm run test:watch` re-runs the tests while you edit.
- `npm run build` builds into `dist/`.

Copy only the command, not the description. In some shells a trailing `# comment` is passed to npm as arguments
and breaks the command.

| Check | What it covers |
|---|---|
| `src/services/financeService.test.js` | Quote and history normalization, % change, ranking, gaps and failures, fallback when a company fails |
| `src/utils/format.test.js` | Price, percent and market-time formatting |
| `server/server.test.js` | Yahoo response mapping, request validation, caching, error codes, 404 for no data |
| `src/utils/symbols.test.js` | Ticker input normalization and validation |
| `src/components/cards/StatCard.test.jsx` | Card rendering |
| `src/components/common/SymbolPicker.test.jsx` | Ticker form: validation messages, submit, clear |
| `src/pages/dashboard/SelectedCompanyView.test.jsx` | Selected-company graph: loading, data, no-data message, other errors, range change |
| `src/pages/DashboardPage.test.jsx` | Dashboard UI: loading, quotes and charts, tab switching, stat cards, error states, selected-company flow |

**Success looks like:**

- `npm run lint` prints no errors or warnings.
- `npm test` ends with `Test Files 8 passed (8)` and `Tests 68 passed (68)`.
- `npm run build` ends with `built in ...`. A "chunks larger than 500 kB" notice is expected (the charting library) and is not a failure.
- `npm run check` exits with code 0 (`echo $?` prints `0`).

Tests never call Yahoo Finance, so they are deterministic and run offline. Live data is checked
manually: run `npm run dev` and confirm that quote cards show real prices and the charts load.

## Dashboard views

The range tabs switch between three views (`src/pages/dashboard/`):

| Tab | View | Content |
|---|---|---|
| Current day | `TodayView` | Quote card per company, "Today's movers" bar chart (vs. previous close), intraday line chart |
| Last 7 days | `ComparisonView` | Best / weakest / IBM-rank stat cards, trend lines, ranking bars |
| Last quarter | `ComparisonView` | Same layout over the quarter |

The focus company (IBM) is set by `FOCUS_SYMBOL` in `src/config/companies.js`.

## Check another company

Below the dashboard, a ticker box lets the user chart any company (for example `AAPL`, `BRK-B`, `^GSPC`):

- The input is trimmed and upper-cased, and checked before anything is fetched. Empty or malformed
  input shows a message under the box.
- A valid ticker adds a quote card and a % change graph for that company under the existing views. It
  follows the selected range tab (current day, 7 days, quarter).
- While loading, the card shows "Loading…".
- If the symbol has no data (unknown, delisted), the card says "No data available for XYZ. Check the
  ticker symbol and try another one." No other company's data is shown in its place.
- Any other failure (network, Yahoo rate limit) shows the error text instead, so it is not mistaken for
  a missing symbol.
- Submit another ticker to replace the graph, or use "Clear" to remove it.

The existing IBM-versus-competitors views do not know about this feature: they use the same code and
data calls as before. The data comes from `getCompanySnapshot(symbol, rangeKey)` in
`src/services/financeService.js`, which fetches only that symbol. The server answers a symbol with no
data with HTTP 404 and code `NO_DATA`.

With `VITE_USE_MOCK=true`, only the tracked companies plus AAPL, GOOGL, AMZN and NVDA have data; any
other symbol shows the no-data message.

## Layout

```text
src/
  main.jsx                 entry point
  App.jsx                  app shell
  pages/                   route-level screens (DashboardPage)
  components/
    cards/                 ChartCard (generic frame), QuoteCard
    charts/                chart implementations (ComparisonLineChart)
    common/                small shared UI (RangeSelector)
  hooks/                   useAsyncData
  services/
    financeService.js      public data API + normalization (UI imports only this)
    providers/             index.js picks httpProvider (live) or mockProvider (VITE_USE_MOCK=true)
  config/companies.js      tracked companies and time ranges
  utils/                   formatting helpers
  styles/                  global CSS
server/
  yahooClient.js           the only module that calls yahoo-finance2; maps responses to the contract
  apiMiddleware.js         /api/quotes and /api/history with validation, caching, error codes
  ranges.js                time range -> Yahoo interval / lookback
```

## Data layer

```
UI -> financeService -> providers/index.js -> httpProvider -> /api (server/) -> yahoo-finance2
                                           \-> mockProvider (offline)
```

Yahoo blocks browser requests (CORS), so `vite.config.js` mounts `server/apiMiddleware.js` into the dev
and preview servers. The browser only ever talks to `/api`.

`financeService` exposes:

- `getQuotes(symbols?)` - `[{ symbol, name, color, price, change, changePercent }]` for summary cards
- `getHistory(symbol, rangeKey)` - `[{ date, close }]` for a single company
- `getComparisonSeries(rangeKey, symbols?)` - `[{ date, IBM: 0, MSFT: 1.2, ... }]`, % change from the
  start of the period. A company that fails to load is left out; it only throws if all fail.

Ranges (`1D`, `7D`, `1Q`) map to Yahoo parameters in `server/ranges.js`: 5-minute bars for the last
trading session, hourly bars for 7 days, daily bars for ~92 days. Regular trading hours only.

Provider contract: `fetchQuotes(symbols) -> [{ symbol, price, previousClose }]` and
`fetchHistory(symbol, rangeKey) -> [{ date: ISO string, close }]`.

## Adding a company

Add `{ symbol, name, color }` to `COMPANIES` in `src/config/companies.js`. No other change is needed;
the quote cards, chart lines and API requests all derive from that list.

## Adding a time range

Add an entry to `TIME_RANGES` (`src/config/companies.js`) and to `RANGES` (`server/ranges.js`). A test
checks the two stay in sync.
