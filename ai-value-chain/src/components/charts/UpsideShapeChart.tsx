import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface UpsideShapeChartProps {
  probability: number     // 0-1
  multiple: number        // effective multiple (already capped)
}

export function UpsideShapeChart({ probability, multiple }: UpsideShapeChartProps) {
  const point = [{ x: probability, y: multiple }]

  return (
    <div className="h-48 relative">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 30 }}>
          <XAxis
            type="number"
            dataKey="x"
            name="Probability"
            domain={[0, 1]}
            tick={{ fill: '#64748b', fontSize: 10 }}
            label={{ value: 'Probability', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10 }}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Multiple"
            domain={[1, 'auto']}
            tick={{ fill: '#64748b', fontSize: 10 }}
            label={{ value: 'Multiple', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
            tickFormatter={(v: number) => `${v}x`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 6 }}
            formatter={(value: number, name: string) => [
              name === 'Probability' ? `${(value * 100).toFixed(0)}%` : `${value}x`,
              name,
            ]}
          />
          {/* Quadrant dividers */}
          <ReferenceLine x={0.4} stroke="#334155" strokeDasharray="3 3" />
          <ReferenceLine y={3} stroke="#334155" strokeDasharray="3 3" />
          {/* The point */}
          <Scatter
            data={point}
            fill="#6366f1"
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Quadrant labels */}
      <div className="absolute top-2 left-8 text-xs text-slate-600">Lottery</div>
      <div className="absolute top-2 right-4 text-xs text-slate-600">Home run</div>
      <div className="absolute bottom-8 left-8 text-xs text-slate-600">Skip</div>
      <div className="absolute bottom-8 right-4 text-xs text-slate-600">Compounder</div>
    </div>
  )
}
