import { describe, it, expect } from 'vitest'
import { scoreCompany } from '../../src/model/index'
import type { Company, ModelConfig } from '../../src/schema/types'

const MOCK_CONFIG: ModelConfig = {
  floor_weights: {
    moat_durability: 0.30,
    revenue_defensibility: 0.40,
    balance_sheet_strength: 0.30,
  },
  ceiling_weights: {
    market_expansion: 0.40,
    competitive_position_ceiling: 0.30,
    strategic_optionality: 0.30,
  },
  valuation_sentiment_multipliers: {
    cheap: 1.20,
    fair: 1.00,
    stretched: 0.85,
    priced_for_perfection: 0.70,
  },
  max_plausible_market_cap_usd_b: 8000,
}

const MOCK_COMPANY: Company = {
  id: 'test_co',
  name: 'Test Company',
  ticker: 'TEST',
  exchange: 'NASDAQ',
  layer: 'silicon_design',
  secondary_layers: [],
  is_dark_horse: false,
  is_exposure_vehicle: false,
  description: 'A test company',
  investability: {
    type: 'direct',
    notes: 'Direct',
    proxy_for: null,
  },
  model: {
    model_updated: '2020-01-01',
    moat_durability: 8,
    moat_durability_rationale: 'Strong',
    revenue_defensibility: 7,
    revenue_defensibility_rationale: 'Good',
    balance_sheet_strength: 6,
    balance_sheet_rationale: 'OK',
    downside_scenario: 'Bad things',
    market_expansion: 8,
    market_expansion_rationale: 'Growing',
    competitive_position_ceiling: 7,
    competitive_position_rationale: 'High',
    strategic_optionality: 6,
    strategic_optionality_rationale: 'Some',
    upside_probability: 0.45,
    upside_multiple: 4.5,
    valuation_sentiment: 'fair',
  },
  fundamentals: {
    market_cap_usd_b: 100,
    market_cap_date: '2020-01-01',
    revenue_ttm_usd_b: 10,
    pe_ratio: 25,
    sources: [
      {
        description: 'Annual report',
        url: 'example.com',
        accessed: '2020-01-01',
        is_sourced_fact: true,
      },
    ],
  },
  strategic_dynamics: [
    { type: 'opportunity', note: 'Growing market' },
  ],
  relationships: [],
}

describe('scoreCompany', () => {
  it('computes all scores correctly', () => {
    const scored = scoreCompany(MOCK_COMPANY, MOCK_CONFIG)

    // floor = 8*0.30 + 7*0.40 + 6*0.30 = 2.4 + 2.8 + 1.8 = 7.0
    expect(scored.floorScore).toBeCloseTo(7.0)

    // ceiling_raw = 8*0.40 + 7*0.30 + 6*0.30 = 3.2 + 2.1 + 1.8 = 7.1
    expect(scored.ceilingRaw).toBeCloseTo(7.1)

    // ceiling_adjusted = 7.1 * 1.00 (fair) = 7.1
    expect(scored.ceilingAdjusted).toBeCloseTo(7.1)

    // effective_multiple = min(4.5, 8000/100) = min(4.5, 80) = 4.5
    expect(scored.effectiveMultiple).toBe(4.5)

    // ev = 0.45 * (4.5 - 1) = 0.45 * 3.5 = 1.575
    expect(scored.ev).toBeCloseTo(1.575)

    // entry_score = 7.0*0.40 + 7.1*0.35 + 1.575*0.25
    //             = 2.8 + 2.485 + 0.39375 = 5.67875
    expect(scored.entryScore).toBeCloseTo(5.67875)
  })

  it('uses live market cap when provided', () => {
    const scored = scoreCompany(MOCK_COMPANY, MOCK_CONFIG, 50)
    // live cap is 50B; effective_multiple = min(4.5, 8000/50) = min(4.5, 160) = 4.5
    expect(scored.currentMarketCapB).toBe(50)
    expect(scored.effectiveMultiple).toBe(4.5)
  })

  it('caps effective multiple for mega-caps', () => {
    const bigCo = {
      ...MOCK_COMPANY,
      fundamentals: { ...MOCK_COMPANY.fundamentals, market_cap_usd_b: 4000 },
      model: { ...MOCK_COMPANY.model!, upside_multiple: 5.0 },
    }
    const scored = scoreCompany(bigCo, MOCK_CONFIG)
    // cap = 8000/4000 = 2.0 < 5.0 → capped at 2.0
    expect(scored.effectiveMultiple).toBeCloseTo(2.0)
  })

  it('marks market data as stale when old', () => {
    // market_cap_date: 2020-01-01 is definitely >21 days ago
    const scored = scoreCompany(MOCK_COMPANY, MOCK_CONFIG)
    expect(scored.isMarketDataStale).toBe(true)
  })

  it('marks model as stale when old', () => {
    // model_updated: 2020-01-01 is definitely >90 days ago
    const scored = scoreCompany(MOCK_COMPANY, MOCK_CONFIG)
    expect(scored.isModelStale).toBe(true)
  })

  it('returns company reference in output', () => {
    const scored = scoreCompany(MOCK_COMPANY, MOCK_CONFIG)
    expect(scored.company.id).toBe('test_co')
  })
})
