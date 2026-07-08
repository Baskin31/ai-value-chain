import { useMemo } from 'react'
import { companies, modelConfig } from '../data/loader'
import { scoreCompany } from '../model'
import { useAppStore } from '../store'
import type { ScoredCompany } from '../model'
import type { ModelConfig } from '../schema/types'

export function useScoredCompanies(): ScoredCompany[] {
  const { weightOverrides, liveMarketCaps } = useAppStore()

  const effectiveConfig = useMemo((): ModelConfig => {
    return {
      ...modelConfig,
      floor_weights: {
        ...modelConfig.floor_weights,
        ...(weightOverrides.moat_durability !== undefined
          ? { moat_durability: weightOverrides.moat_durability }
          : {}),
        ...(weightOverrides.revenue_defensibility !== undefined
          ? { revenue_defensibility: weightOverrides.revenue_defensibility }
          : {}),
        ...(weightOverrides.balance_sheet_strength !== undefined
          ? { balance_sheet_strength: weightOverrides.balance_sheet_strength }
          : {}),
      },
      ceiling_weights: {
        ...modelConfig.ceiling_weights,
        ...(weightOverrides.market_expansion !== undefined
          ? { market_expansion: weightOverrides.market_expansion }
          : {}),
        ...(weightOverrides.competitive_position_ceiling !== undefined
          ? { competitive_position_ceiling: weightOverrides.competitive_position_ceiling }
          : {}),
        ...(weightOverrides.strategic_optionality !== undefined
          ? { strategic_optionality: weightOverrides.strategic_optionality }
          : {}),
      },
    }
  }, [weightOverrides])

  return useMemo(() => {
    return companies
      .filter((c) => c.model)
      .map((c) => {
        const liveCap = c.ticker ? liveMarketCaps[c.ticker] : undefined
        return scoreCompany(c, effectiveConfig, liveCap)
      })
  }, [effectiveConfig, liveMarketCaps])
}
