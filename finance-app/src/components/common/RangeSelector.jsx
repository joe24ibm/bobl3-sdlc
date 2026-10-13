import { TIME_RANGES } from '../../config/companies.js';

export default function RangeSelector({ value, onChange }) {
  return (
    <div className="range-selector" role="tablist" aria-label="Time range">
      {TIME_RANGES.map((range) => (
        <button
          key={range.key}
          role="tab"
          aria-selected={range.key === value}
          className={range.key === value ? 'active' : ''}
          onClick={() => onChange(range.key)}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
