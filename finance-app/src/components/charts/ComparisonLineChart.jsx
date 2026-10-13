import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDateLabel } from '../../utils/format.js';

/** Multi-series line chart. `data` rows look like { date, IBM: 1.2, MSFT: -0.4 }. */
export default function ComparisonLineChart({ data, companies, rangeKey }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={(d) => formatDateLabel(d, rangeKey)} minTickGap={24} />
        <YAxis tickFormatter={(v) => `${v}%`} />
        <Tooltip labelFormatter={(d) => formatDateLabel(d, rangeKey)} formatter={(v) => `${v}%`} />
        <Legend />
        {companies.map((c) => (
          <Line
            key={c.symbol}
            type="monotone"
            dataKey={c.symbol}
            name={c.name}
            stroke={c.color}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
