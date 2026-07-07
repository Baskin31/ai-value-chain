import { z } from 'zod'

const InvestabilityTypeSchema = z.enum([
  'direct',
  'adr',
  'proxy',
  'hk_stock_connect',
  'etf_bucket',
  'uninvestable',
])

const InvestabilitySchema = z.object({
  type: InvestabilityTypeSchema,
  notes: z.string(),
  proxy_for: z.string().nullable(),
})

const SourceSchema = z.object({
  description: z.string().min(1),
  url: z.string(),  // not z.string().url() — some entries may be bare domain names
  accessed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  is_sourced_fact: z.boolean(),
})

const FundamentalsSchema = z.object({
  market_cap_usd_b: z.number().positive(),
  market_cap_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  revenue_ttm_usd_b: z.number().nonnegative().optional(),
  revenue_growth_yoy: z.number().optional(),
  pe_ratio: z.number().positive().nullable().optional(),
  sources: z.array(SourceSchema),
})

const StrategicDynamicSchema = z.object({
  type: z.enum(['risk', 'opportunity']),
  note: z.string().min(1),
})

const RelationshipSchema = z.object({
  company_id: z.string().regex(/^[a-z0-9_-]+$/),
  type: z.enum(['supplier', 'customer', 'competitor', 'investor', 'investee']),
  note: z.string(),
})

export const ValuationSentimentSchema = z.enum([
  'cheap',
  'fair',
  'stretched',
  'priced_for_perfection',
])

const ModelInputsSchema = z.object({
  model_updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  moat_durability: z.number().min(0).max(10),
  moat_durability_rationale: z.string().min(1),
  revenue_defensibility: z.number().min(0).max(10),
  revenue_defensibility_rationale: z.string().min(1),
  balance_sheet_strength: z.number().min(0).max(10),
  balance_sheet_rationale: z.string().min(1),
  downside_scenario: z.string().min(1),
  market_expansion: z.number().min(0).max(10),
  market_expansion_rationale: z.string().min(1),
  competitive_position_ceiling: z.number().min(0).max(10),
  competitive_position_rationale: z.string().min(1),
  strategic_optionality: z.number().min(0).max(10),
  strategic_optionality_rationale: z.string().min(1),
  upside_probability: z.number().min(0).max(1),
  upside_multiple: z.number().min(1),
  valuation_sentiment: ValuationSentimentSchema,
})

export const CompanySchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/),
  name: z.string().min(1),
  ticker: z.string().nullable().optional(),
  exchange: z.string().nullable().optional(),
  layer: z.string(),
  secondary_layers: z.array(z.string()).optional().default([]),
  is_dark_horse: z.boolean(),
  is_exposure_vehicle: z.boolean().optional().default(false),
  description: z.string().min(1),
  investability: InvestabilitySchema,
  model: ModelInputsSchema.optional(),
  fundamentals: FundamentalsSchema,
  strategic_dynamics: z.array(StrategicDynamicSchema),
  relationships: z.array(RelationshipSchema).optional().default([]),
}).superRefine((data, ctx) => {
  // model is required unless is_exposure_vehicle is true
  if (!data.is_exposure_vehicle && !data.model) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'model is required for non-exposure-vehicle companies',
      path: ['model'],
    })
  }
  // proxy_for must be non-null when type === 'proxy'
  if (data.investability.type === 'proxy' && data.investability.proxy_for === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'proxy_for must be non-null when investability.type is "proxy"',
      path: ['investability', 'proxy_for'],
    })
  }
})

export type Company = z.infer<typeof CompanySchema>
export type InvestabilityType = z.infer<typeof InvestabilityTypeSchema>
export type ValuationSentiment = z.infer<typeof ValuationSentimentSchema>
export type ModelInputs = z.infer<typeof ModelInputsSchema>
