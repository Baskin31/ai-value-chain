import { describe, it, expect } from 'vitest'
import { computeFloor } from '../../src/model/floor'

const DEFAULT_WEIGHTS = {
  moat_durability: 0.30,
  revenue_defensibility: 0.40,
  balance_sheet_strength: 0.30,
}

describe('computeFloor', () => {
  it('computes weighted sum correctly', () => {
    const result = computeFloor(
      { moat_durability: 8, revenue_defensibility: 7, balance_sheet_strength: 6 },
      DEFAULT_WEIGHTS
    )
    // 8*0.30 + 7*0.40 + 6*0.30 = 2.4 + 2.8 + 1.8 = 7.0
    expect(result).toBeCloseTo(7.0)
  })

  it('returns 10 for perfect scores', () => {
    const result = computeFloor(
      { moat_durability: 10, revenue_defensibility: 10, balance_sheet_strength: 10 },
      DEFAULT_WEIGHTS
    )
    expect(result).toBeCloseTo(10.0)
  })

  it('returns 0 for zero scores', () => {
    const result = computeFloor(
      { moat_durability: 0, revenue_defensibility: 0, balance_sheet_strength: 0 },
      DEFAULT_WEIGHTS
    )
    expect(result).toBe(0)
  })

  it('respects custom weight overrides', () => {
    const result = computeFloor(
      { moat_durability: 10, revenue_defensibility: 0, balance_sheet_strength: 0 },
      { moat_durability: 1.0, revenue_defensibility: 0, balance_sheet_strength: 0 }
    )
    expect(result).toBeCloseTo(10.0)
  })
})
