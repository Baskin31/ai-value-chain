import { differenceInDays, parseISO } from 'date-fns'
import type { Company, ModelConfig } from '../schema/types'
import { computeFloor } from './floor'
import { computeCeilingRaw, computeCeilingAdjusted } from './ceiling'
import { computeEffectiveMultiple } from './valuation'
import { computeEV } from './upside'

export interface ScoredCompany {
  company: Company
  floorScore: number
  ceilingRaw: number
  ceilingAdjusted: number
  effectiveMultiple: number
  ev: number
  entryScore: number
  currentMarketCapB: number
  isMarketDataStale: boolean
  isModelStale: boolean

  // Dollar figures
  floorMarketCapB: number
  ceilingMarketCapB: number
  expectedReturnMultiple: number

  // Scenario breakdown (probabilities summing to 1.0)
  scenarioBreakdown: {
    impaired: number
    flat: number
    strong: number
    transformative: number
  }

  // vs VOO benchmark (3-year horizon, 30% expected = ~10%/yr)
  vsVooReturn: number
}

export function scoreCompany(
  company: Company,
  config: ModelConfig,
  liveMarketCapB?: number
): ScoredCompany {
  const model = company.model!
  const currentMarketCapB = liveMarketCapB ?? company.fundamentals.market_cap_usd_b

  const floorScore = computeFloor(model, config.floor_weights)
  const ceilingRaw = computeCeilingRaw(model, config.ceiling_weights)
  const ceilingAdjusted = computeCeilingAdjusted(
    ceilingRaw,
    model.valuation_sentiment,
    config.valuation_sentiment_multipliers
  )
  const effectiveMultiple = computeEffectiveMultiple(
    model.upside_multiple,
    currentMarketCapB,
    config.max_plausible_market_cap_usd_b
  )
  const ev = computeEV(model.upside_probability, effectiveMultiple)
  const entryScore =
    floorScore * 0.40 + ceilingAdjusted * 0.35 + ev * 0.25

  const VOO_BENCHMARK = 0.30
  const prob = model.upside_probability
  const f = floorScore

  const floorMarketCapB = currentMarketCapB * (floorScore / 10)
  const ceilingMarketCapB = currentMarketCapB * effectiveMultiple
  const expectedReturnMultiple = 1 + ev
  const scenarioBreakdown = {
    impaired: (1 - prob) * (1 - f / 10),
    flat: (1 - prob) * (f / 10),
    strong: prob * 0.60,
    transformative: prob * 0.40,
  }
  const vsVooReturn = expectedReturnMultiple - 1 - VOO_BENCHMARK

  const now = new Date()
  const isMarketDataStale = liveMarketCapB !== undefined
    ? false
    : differenceInDays(now, parseISO(company.fundamentals.market_cap_date)) > 21
  const isModelStale =
    differenceInDays(now, parseISO(model.model_updated)) > 90

  return {
    company,
    floorScore,
    ceilingRaw,
    ceilingAdjusted,
    effectiveMultiple,
    ev,
    entryScore,
    currentMarketCapB,
    isMarketDataStale,
    isModelStale,
    floorMarketCapB,
    ceilingMarketCapB,
    expectedReturnMultiple,
    scenarioBreakdown,
    vsVooReturn,
  }
}

export { computeFloor } from './floor'
export { computeCeilingRaw, computeCeilingAdjusted } from './ceiling'
export { computeEffectiveMultiple } from './valuation'
export { computeEV } from './upside'
