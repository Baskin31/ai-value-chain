import { z } from 'zod'

const WeightsSchema = z.object({
  moat_durability: z.number().positive(),
  revenue_defensibility: z.number().positive(),
  balance_sheet_strength: z.number().positive(),
})

const CeilingWeightsSchema = z.object({
  market_expansion: z.number().positive(),
  competitive_position_ceiling: z.number().positive(),
  strategic_optionality: z.number().positive(),
})

const ValuationMultipliersSchema = z.object({
  cheap: z.number().positive(),
  fair: z.number().positive(),
  stretched: z.number().positive(),
  priced_for_perfection: z.number().positive(),
})

export const ModelConfigSchema = z.object({
  floor_weights: WeightsSchema,
  ceiling_weights: CeilingWeightsSchema,
  valuation_sentiment_multipliers: ValuationMultipliersSchema,
  max_plausible_market_cap_usd_b: z.number().positive(),
})

export type ModelConfig = z.infer<typeof ModelConfigSchema>
