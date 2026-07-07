import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { ModelConfig } from '../../schema/types'

interface ScoreBarProps {
  type: 'floor' | 'ceiling'
  scores: {
    moat_durability?: number
    revenue_defensibility?: number
    balance_sheet_strength?: number
    market_expansion?: number
    competitive_position_ceiling?: number
    strategic_optionality?: number
  }
  weights: ModelConfig['floor_weights'] | ModelConfig['ceiling_weights']
}

export function ScoreBar({ type, scores, weights }: ScoreBarProps) {
  const data =
    type === 'floor'
      ? [
          {
            name: 'Moat',
            value: scores.moat_durability ?? 0,
            weight: (weights as ModelConfig['floor_weights']).moat_durability,
          },
          {
            name: 'Rev Def',
            value: scores.revenue_defensibility ?? 0,
            weight: (weights as ModelConfig['floor_weights']).revenue_defensibility,
          },
          {
            name: 'Balance',
            value: scores.balance_sheet_strength ?? 0,
            weight: (weights as ModelConfig['floor_weights']).balance_sheet_strength,
          },
        ]
      : [
          {
            name: 'Mkt Exp',
            value: scores.market_expansion ?? 0,
            weight: (weights as ModelConfig['ceiling_weights']).market_expansion,
          },
          {
            name: 'Comp Ceil',
            value: scores.competitive_position_ceiling ?? 0,
            weight: (weights as ModelConfig['ceiling_weights']).competitive_position_ceiling,
          },
          {
            name: 'Optionality',
            value: scores.strategic_optionality ?? 0,
            weight: (weights as ModelConfig['ceiling_weights']).strategic_optionality,
          },
        ]

  const barColor = type === 'floor' ? '#3b82f6' : '#f59e0b'

  return (
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 60 }}>
          <XAxis type="number" domain={[0, 10]} tick={{ fill: '#64748b', fontSize: 10 }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            width={56}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 6 }}
            labelStyle={{ color: '#e2e8f0' }}
            formatter={(value: number, _name: string, props: { payload?: { weight?: number } }) => [
              `${value}/10 (weight: ${((props.payload?.weight ?? 0) * 100).toFixed(0)}%)`,
              '',
            ]}
          />
          <Bar dataKey="value" radius={[0, 3, 3, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={barColor} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
