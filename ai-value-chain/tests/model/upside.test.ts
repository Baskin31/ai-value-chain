import { describe, it, expect } from 'vitest'
import { computeEV } from '../../src/model/upside'

describe('computeEV', () => {
  it('computes expected value correctly', () => {
    // 0.45 probability × (4.5 - 1) = 0.45 × 3.5 = 1.575
    expect(computeEV(0.45, 4.5)).toBeCloseTo(1.575)
  })

  it('returns 0 for 0 probability', () => {
    expect(computeEV(0, 5.0)).toBe(0)
  })

  it('handles effective_multiple of 1 (no upside)', () => {
    // Probability × (1 - 1) = 0
    expect(computeEV(0.5, 1.0)).toBe(0)
  })

  it('handles high-probability small gain', () => {
    // 0.80 × (1.5 - 1) = 0.80 × 0.5 = 0.4
    expect(computeEV(0.80, 1.5)).toBeCloseTo(0.4)
  })
})
