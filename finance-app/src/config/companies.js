// Tracked companies. Add an entry here to include it in the dashboard (max 5 recommended).
export const COMPANIES = [
  { symbol: 'IBM', name: 'IBM', color: '#0f62fe' },
  { symbol: 'MSFT', name: 'Microsoft', color: '#198038' },
  { symbol: 'ORCL', name: 'Oracle', color: '#da1e28' },
  { symbol: 'SAP', name: 'SAP', color: '#8a3ffc' },
  { symbol: 'CRM', name: 'Salesforce', color: '#b28600' },
];

// Line color for a user-chosen company that is not one of the tracked ones.
export const SELECTED_COMPANY_COLOR = '#ee5396';

// The company the dashboard is about; the others are its competitors.
export const FOCUS_SYMBOL = 'IBM';

export const TIME_RANGES = [
  { key: '1D', label: 'Current day', points: 24 },
  { key: '7D', label: 'Last 7 days', points: 7 },
  { key: '1Q', label: 'Last quarter', points: 63 },
];

export const DEFAULT_RANGE = '1D';
