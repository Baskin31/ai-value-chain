import type { ModelConfig, ValuationSentiment } from '../schema/types'

type CeilingInputs = {
  market_expansion: number
  competitive_position_ceiling: number
  strategic_optionality: number
}

export function computeCeilingRaw(
  inputs: CeilingInputs,
  weights: ModelConfig['ceiling_weights']
): number {
  return (
    inputs.market_expansion * weights.market_expansion +
    inputs.competitive_position_ceiling * weights.competitive_position_ceiling +
    inputs.strategic_optionality * weights.strategic_optionality
  )
}

export function computeCeilingAdjusted(
  ceilingRaw: number,
  sentiment: ValuationSentiment,
  multipliers: ModelConfig['valuation_sentiment_multipliers']
): number {
  return ceilingRaw * multipliers[sentiment]
}
