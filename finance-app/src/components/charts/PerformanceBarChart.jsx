import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const asPercent = (v) => `${v > 0 ? '+' : ''}${v}%`;

/** Horizontal ranking bars. `data` items: { name, color, changePercent }, already sorted. */
export default function PerformanceBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 56, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="name" width={90} />
        <Tooltip formatter={asPercent} />
        <ReferenceLine x={0} stroke="#6f6f6f" />
        <Bar dataKey="changePercent" name="Change" isAnimationActive={false}>
          {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          <LabelList dataKey="changePercent" position="right" formatter={asPercent} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
