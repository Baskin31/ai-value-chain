import { useMemo, useState } from 'react'
import { companies, modelConfig } from '../../data/loader'
import { useAppStore } from '../../store'
import { useScoredCompanies } from '../../hooks/useScoredCompanies'
import { useApiKey } from '../../hooks/useApiKey'
import { fetchAIAnalysis } from '../../market/client'
import { ScoreBar } from '../charts/ScoreBar'
import { UpsideShapeChart } from '../charts/UpsideShapeChart'
import { DisclaimerInline } from '../Disclaimer'
import { differenceInDays, parseISO } from 'date-fns'
import type { Company } from '../../schema/types'

const SENTIMENT_LABEL: Record<string, string> = {
  cheap: 'Cheap',
  fair: 'Fair value',
  stretched: 'Stretched',
  priced_for_perfection: 'Priced for perfection',
}

const SENTIMENT_COLOR: Record<string, string> = {
  cheap: 'text-emerald-400',
  fair: 'text-slate-300',
  stretched: 'text-amber-400',
  priced_for_perfection: 'text-rose-400',
}

interface CompanyDetailProps {
  companyId: string
}

export function CompanyDetail({ companyId }: CompanyDetailProps) {
  const { weightOverrides, dynamicCompanies, addDynamicCompany, liveMarketCaps } = useAppStore()
  const { apiKey } = useApiKey()
  const [reanalyzing, setReanalyzing] = useState(false)
  const [reanalyzeMsg, setReanalyzeMsg] = useState<string | null>(null)

  // Dynamic companies override static ones (re-analysis support)
  const company = useMemo(
    () => dynamicCompanies.find((c) => c.id === companyId) ?? companies.find((c: Company) => c.id === companyId),
    [companyId, dynamicCompanies]
  )

  const allScored = useScoredCompanies()
  const scored = useMemo(
    () => allScored.find((s) => s.company.id === companyId) ?? null,
    [allScored, companyId]
  )

  async function handleReanalyze() {
    if (!company) return
    if (!apiKey) {
      setReanalyzeMsg('No API key — click ⚿ in the header to add yours.')
      return
    }
    setReanalyzing(true)
    setReanalyzeMsg(null)
    try {
      const liveCap = company.ticker ? (liveMarketCaps[company.ticker] ?? company.fundamentals.market_cap_usd_b) : company.fundamentals.market_cap_usd_b
      const result = await fetchAIAnalysis(company.ticker ?? company.id, company.name, liveCap, apiKey)
      const today = new Date().toISOString().slice(0, 10)
      const updated: Company = {
        ...company,
        description: result.description || company.description,
        is_dark_horse: result.is_dark_horse ?? company.is_dark_horse,
        layer: result.suggested_layer || company.layer,
        strategic_dynamics: result.strategic_dynamics?.length ? result.strategic_dynamics : company.strategic_dynamics,
        model: {
          model_updated: today,
          moat_durability: result.moat_durability,
          moat_durability_rationale: result.moat_durability_rationale,
          revenue_defensibility: result.revenue_defensibility,
          revenue_defensibility_rationale: result.revenue_defensibility_rationale,
          balance_sheet_strength: result.balance_sheet_strength,
          balance_sheet_rationale: result.balance_sheet_rationale,
          downside_scenario: result.downside_scenario,
          market_expansion: result.market_expansion,
          market_expansion_rationale: result.market_expansion_rationale,
          competitive_position_ceiling: result.competitive_position_ceiling,
          competitive_position_rationale: result.competitive_position_rationale,
          strategic_optionality: result.strategic_optionality,
          strategic_optionality_rationale: result.strategic_optionality_rationale,
          upside_probability: result.upside_probability,
          upside_multiple: result.upside_multiple,
          valuation_sentiment: result.valuation_sentiment,
        },
        fundamentals: {
          ...company.fundamentals,
          market_cap_usd_b: liveCap,
          market_cap_date: today,
        },
      }
      addDynamicCompany(updated)
      setReanalyzeMsg('Analysis updated.')
      setTimeout(() => setReanalyzeMsg(null), 3000)
    } catch (err) {
      setReanalyzeMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setReanalyzing(false)
    }
  }
  const effectiveConfig = useMemo(() => ({
    ...modelConfig,
    floor_weights: {
      ...modelConfig.floor_weights,
      ...(weightOverrides.moat_durability !== undefined ? { moat_durability: weightOverrides.moat_durability } : {}),
      ...(weightOverrides.revenue_defensibility !== undefined ? { revenue_defensibility: weightOverrides.revenue_defensibility } : {}),
      ...(weightOverrides.balance_sheet_strength !== undefined ? { balance_sheet_strength: weightOverrides.balance_sheet_strength } : {}),
    },
    ceiling_weights: {
      ...modelConfig.ceiling_weights,
      ...(weightOverrides.market_expansion !== undefined ? { market_expansion: weightOverrides.market_expansion } : {}),
      ...(weightOverrides.competitive_position_ceiling !== undefined ? { competitive_position_ceiling: weightOverrides.competitive_position_ceiling } : {}),
      ...(weightOverrides.strategic_optionality !== undefined ? { strategic_optionality: weightOverrides.strategic_optionality } : {}),
    },
  }), [weightOverrides])

  if (!company) {
    return <p className="text-slate-500 text-sm">Company not found.</p>
  }

  const model = company.model
  const fund = company.fundamentals

  return (
    <div className="space-y-6 text-sm">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-1">
          <h1 className="text-slate-100 font-semibold text-lg leading-tight">{company.name}</h1>
          {company.is_dark_horse && (
            <span className="text-amber-400 text-sm shrink-0" title="Dark horse">◆ Dark horse</span>
          )}
        </div>
        {company.ticker && (
          <p className="text-slate-500 font-mono text-xs mb-2">
            {company.ticker} · {company.exchange}
          </p>
        )}
        <p className="text-slate-300 leading-relaxed">{company.description}</p>
      </div>

      {/* Investability */}
      <div>
        <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Investability</h2>
        <div className="bg-slate-800 rounded-lg p-3 space-y-1">
          <div className="text-slate-300">{company.investability.notes}</div>
          {company.investability.proxy_for && (
            <div className="text-slate-500 text-xs">Proxy for: {company.investability.proxy_for}</div>
          )}
        </div>
      </div>

      {/* Scores (only if has model) */}
      {scored && model && (
        <>
          {/* Summary scores */}
          <div>
            <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-3">Scores</h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-slate-800 rounded-lg p-3 text-center">
                <div className="text-blue-400 font-mono text-xl">{scored.floorScore.toFixed(1)}</div>
                <div className="text-slate-500 text-xs mt-0.5">Floor</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-3 text-center">
                <div className="text-amber-400 font-mono text-xl">{scored.ceilingAdjusted.toFixed(1)}</div>
                <div className="text-slate-500 text-xs mt-0.5">Ceiling</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-3 text-center">
                <div className="text-indigo-400 font-mono text-xl">{scored.entryScore.toFixed(2)}</div>
                <div className="text-slate-500 text-xs mt-0.5">Entry</div>
              </div>
            </div>

            {/* Floor breakdown */}
            <p className="text-slate-500 text-xs mb-1">Floor breakdown</p>
            <ScoreBar type="floor" scores={model} weights={effectiveConfig.floor_weights} />

            {/* Ceiling breakdown */}
            <p className="text-slate-500 text-xs mb-1 mt-3">Ceiling breakdown</p>
            <ScoreBar type="ceiling" scores={model} weights={effectiveConfig.ceiling_weights} />
          </div>

          {/* Valuation */}
          <div>
            <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Valuation</h2>
            <div className="bg-slate-800 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Sentiment</span>
                <span className={`font-medium ${SENTIMENT_COLOR[model.valuation_sentiment]}`}>
                  {SENTIMENT_LABEL[model.valuation_sentiment]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Upside probability</span>
                <span className="text-slate-300 font-mono">{(model.upside_probability * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Analyst multiple</span>
                <span className="text-slate-300 font-mono">{model.upside_multiple}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Effective multiple</span>
                <span className="text-slate-300 font-mono">{scored.effectiveMultiple.toFixed(1)}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Expected value</span>
                <span className="text-slate-300 font-mono">{scored.ev.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Upside shape */}
          <div>
            <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Upside Shape</h2>
            <UpsideShapeChart
              probability={model.upside_probability}
              multiple={scored.effectiveMultiple}
            />
          </div>

          {/* Model rationales */}
          <div>
            <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Model Inputs</h2>
            <div className="space-y-3">
              {[
                { label: 'Moat durability', score: model.moat_durability, rationale: model.moat_durability_rationale },
                { label: 'Revenue defensibility', score: model.revenue_defensibility, rationale: model.revenue_defensibility_rationale },
                { label: 'Balance sheet', score: model.balance_sheet_strength, rationale: model.balance_sheet_rationale },
                { label: 'Market expansion', score: model.market_expansion, rationale: model.market_expansion_rationale },
                { label: 'Competitive ceiling', score: model.competitive_position_ceiling, rationale: model.competitive_position_rationale },
                { label: 'Strategic optionality', score: model.strategic_optionality, rationale: model.strategic_optionality_rationale },
              ].map(({ label, score, rationale }) => (
                <div key={label} className="bg-slate-800 rounded-lg p-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-300 font-medium text-xs">{label}</span>
                    <span className="text-slate-400 font-mono text-xs">{score}/10</span>
                  </div>
                  <p className="text-slate-500 text-xs leading-relaxed">{rationale}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Downside scenario */}
          <div>
            <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Downside Scenario</h2>
            <div className="bg-rose-950 border border-rose-900 rounded-lg p-3">
              <p className="text-rose-300 text-xs leading-relaxed">{model.downside_scenario}</p>
            </div>
          </div>
        </>
      )}

      {/* Fundamentals */}
      <div>
        <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Fundamentals</h2>
        <div className="bg-slate-800 rounded-lg p-3 space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Market cap</span>
            <span className="text-slate-300 font-mono">
              ${fund.market_cap_usd_b.toFixed(0)}B
              {scored?.isMarketDataStale && <span className="text-amber-400 ml-1">⚠</span>}
            </span>
          </div>
          {fund.revenue_ttm_usd_b !== undefined && (
            <div className="flex justify-between">
              <span className="text-slate-400">Revenue TTM</span>
              <span className="text-slate-300 font-mono">${fund.revenue_ttm_usd_b.toFixed(1)}B</span>
            </div>
          )}
          {fund.revenue_growth_yoy !== undefined && (
            <div className="flex justify-between">
              <span className="text-slate-400">Revenue growth YoY</span>
              <span className="text-slate-300 font-mono">{(fund.revenue_growth_yoy * 100).toFixed(0)}%</span>
            </div>
          )}
          {fund.pe_ratio !== null && fund.pe_ratio !== undefined && (
            <div className="flex justify-between">
              <span className="text-slate-400">P/E ratio</span>
              <span className="text-slate-300 font-mono">{fund.pe_ratio}x</span>
            </div>
          )}
          <div className="text-slate-600 text-xs">Price data as of {fund.market_cap_date}</div>
        </div>
      </div>

      {/* Strategic dynamics */}
      {company.strategic_dynamics.length > 0 && (
        <div>
          <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Strategic Dynamics</h2>
          <div className="space-y-2">
            {company.strategic_dynamics.map((d, i) => (
              <div
                key={i}
                className={[
                  'rounded-lg p-3 text-xs leading-relaxed',
                  d.type === 'opportunity'
                    ? 'bg-emerald-950 border border-emerald-900 text-emerald-300'
                    : 'bg-rose-950 border border-rose-900 text-rose-300',
                ].join(' ')}
              >
                <span className="font-medium uppercase text-xs mr-2 opacity-60">
                  {d.type === 'opportunity' ? '↑' : '↓'}
                </span>
                {d.note}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Relationships */}
      {company.relationships && company.relationships.length > 0 && (
        <div>
          <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Relationships</h2>
          <div className="space-y-1.5">
            {company.relationships.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                <span className="shrink-0 text-slate-600 font-mono">{r.type}</span>
                <span className="text-slate-300 font-mono">{r.company_id}</span>
                <span className="text-slate-500">— {r.note}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {fund.sources.length > 0 && (
        <div>
          <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Sources</h2>
          <div className="space-y-1.5">
            {fund.sources.map((s, i) => {
              const href = s.url.startsWith('http') ? s.url : `https://${s.url}`
              return (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors flex-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {s.description}
                  </a>
                  <span className="text-slate-600 shrink-0">{s.accessed}</span>
                  {!s.is_sourced_fact && <span className="text-amber-700 shrink-0">(est.)</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Model date + re-analyze */}
      {model && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-600">
              AI analysis: {model.model_updated}
              {differenceInDays(new Date(), parseISO(model.model_updated)) > 28 && (
                <span className="text-amber-500 ml-1.5">⚠ &gt;4 weeks old</span>
              )}
            </span>
            <button
              onClick={handleReanalyze}
              disabled={reanalyzing}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-400 transition-colors disabled:opacity-50"
            >
              <span className={reanalyzing ? 'animate-spin inline-block' : 'inline-block'}>↻</span>
              {reanalyzing ? 'Analyzing…' : 'Re-analyze with AI'}
            </button>
          </div>
          {reanalyzeMsg && (
            <p className="text-xs text-slate-400">{reanalyzeMsg}</p>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <DisclaimerInline />
    </div>
  )
}
