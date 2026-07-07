import { describe, it, expect } from 'vitest'
import { computeEffectiveMultiple } from '../../src/model/valuation'

describe('computeEffectiveMultiple', () => {
  it('returns upside_multiple when it is below the plausibility cap', () => {
    // Small-cap with huge upside — not capped
    const result = computeEffectiveMultiple(8.0, 3, 8000)
    // cap = 8000/3 = 2666.7 — much larger than 8.0
    expect(result).toBe(8.0)
  })

  it('caps at max_plausible when upside_multiple implies unreachable valuation', () => {
    // NVIDIA at $3200B: upside_multiple=2.5, cap = 8000/3200 = 2.5 → exact
    const result = computeEffectiveMultiple(2.5, 3200, 8000)
    expect(result).toBeCloseTo(2.5)
  })

  it('caps when upside multiple is too large for mega-cap', () => {
    // Hypothetical $4000B company with 3x multiple: cap = 8000/4000 = 2.0
    const result = computeEffectiveMultiple(3.0, 4000, 8000)
    expect(result).toBeCloseTo(2.0)
  })

  it('does not cap when current cap is small relative to max', () => {
    // $10B company with 5x: cap = 8000/10 = 800 — well above 5
    const result = computeEffectiveMultiple(5.0, 10, 8000)
    expect(result).toBe(5.0)
  })
})
