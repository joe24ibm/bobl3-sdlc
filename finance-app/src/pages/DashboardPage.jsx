import { useState } from 'react';
import RangeSelector from '../components/common/RangeSelector.jsx';
import { DEFAULT_RANGE } from '../config/companies.js';
import ComparisonView from './dashboard/ComparisonView.jsx';
import TodayView from './dashboard/TodayView.jsx';

// Three views, one per time range: 1D market summary, 7D trend comparison, 1Q comparison.
export default function DashboardPage() {
  const [rangeKey, setRangeKey] = useState(DEFAULT_RANGE);

  return (
    <div className="dashboard">
      <RangeSelector value={rangeKey} onChange={setRangeKey} />
      {rangeKey === '1D' ? <TodayView /> : <ComparisonView key={rangeKey} rangeKey={rangeKey} />}
    </div>
  );
}
