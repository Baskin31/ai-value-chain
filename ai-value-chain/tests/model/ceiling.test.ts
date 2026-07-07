import { describe, it, expect } from 'vitest'
import { computeCeilingRaw, computeCeilingAdjusted } from '../../src/model/ceiling'

const DEFAULT_WEIGHTS = {
  market_expansion: 0.40,
  competitive_position_ceiling: 0.30,
  strategic_optionality: 0.30,
}

const DEFAULT_MULTIPLIERS = {
  cheap: 1.20,
  fair: 1.00,
  stretched: 0.85,
  priced_for_perfection: 0.70,
}

describe('computeCeilingRaw', () => {
  it('computes weighted sum correctly', () => {
    const result = computeCeilingRaw(
      { market_expansion: 8, competitive_position_ceiling: 7, strategic_optionality: 6 },
      DEFAULT_WEIGHTS
    )
    // 8*0.40 + 7*0.30 + 6*0.30 = 3.2 + 2.1 + 1.8 = 7.1
    expect(result).toBeCloseTo(7.1)
  })
})

describe('computeCeilingAdjusted', () => {
  it('applies cheap multiplier (1.20)', () => {
    expect(computeCeilingAdjusted(7.0, 'cheap', DEFAULT_MULTIPLIERS)).toBeCloseTo(8.4)
  })

  it('applies fair multiplier (1.00)', () => {
    expect(computeCeilingAdjusted(7.0, 'fair', DEFAULT_MULTIPLIERS)).toBeCloseTo(7.0)
  })

  it('applies stretched multiplier (0.85)', () => {
    expect(computeCeilingAdjusted(7.0, 'stretched', DEFAULT_MULTIPLIERS)).toBeCloseTo(5.95)
  })

  it('applies priced_for_perfection multiplier (0.70)', () => {
    expect(computeCeilingAdjusted(7.0, 'priced_for_perfection', DEFAULT_MULTIPLIERS)).toBeCloseTo(4.9)
  })
})
