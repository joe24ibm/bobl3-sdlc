import { useState } from 'react';
import RangeSelector from '../components/common/RangeSelector.jsx';
import SymbolPicker from '../components/common/SymbolPicker.jsx';
import { DEFAULT_RANGE } from '../config/companies.js';
import ComparisonView from './dashboard/ComparisonView.jsx';
import SelectedCompanyView from './dashboard/SelectedCompanyView.jsx';
import TodayView from './dashboard/TodayView.jsx';

// Three views, one per time range: 1D market summary, 7D trend comparison, 1Q comparison.
// Below them, an optional graph for a company the user picks (follows the selected range).
export default function DashboardPage() {
  const [rangeKey, setRangeKey] = useState(DEFAULT_RANGE);
  const [selectedSymbol, setSelectedSymbol] = useState(null);

  return (
    <div className="dashboard">
      <RangeSelector value={rangeKey} onChange={setRangeKey} />
      {rangeKey === '1D' ? <TodayView /> : <ComparisonView key={rangeKey} rangeKey={rangeKey} />}

      <SymbolPicker selected={selectedSymbol} onSubmit={setSelectedSymbol} onClear={() => setSelectedSymbol(null)} />
      {selectedSymbol && <SelectedCompanyView key={selectedSymbol} symbol={selectedSymbol} rangeKey={rangeKey} />}
    </div>
  );
}
