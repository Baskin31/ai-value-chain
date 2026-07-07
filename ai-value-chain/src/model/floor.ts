import type { ModelConfig } from '../schema/types'

type FloorInputs = {
  moat_durability: number
  revenue_defensibility: number
  balance_sheet_strength: number
}

export function computeFloor(
  inputs: FloorInputs,
  weights: ModelConfig['floor_weights']
): number {
  return (
    inputs.moat_durability * weights.moat_durability +
    inputs.revenue_defensibility * weights.revenue_defensibility +
    inputs.balance_sheet_strength * weights.balance_sheet_strength
  )
}
