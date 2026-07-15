import { useState } from 'react'
import { layers } from '../data/loader'
import { useAppStore } from '../store'
import { useApiKey } from '../hooks/useApiKey'
import { fetchAIAnalysis } from '../market/client'
import type { Company, InvestabilityType, ValuationSentiment } from '../schema/company'

interface Props {
  open: boolean
  onClose: () => void
  initialTicker: string
  initialName: string
  initialMarketCapB: number
}

const INVESTABILITY_OPTIONS: Array<{ value: InvestabilityType; label: string }> = [
  { value: 'direct', label: 'Direct (US listed)' },
  { value: 'adr', label: 'ADR' },
  { value: 'proxy', label: 'Proxy / OTC' },
  { value: 'hk_stock_connect', label: 'HK Stock Connect' },
  { value: 'etf_bucket', label: 'ETF' },
  { value: 'uninvestable', label: 'Not listed' },
]

const SENTIMENT_OPTIONS: Array<{ value: ValuationSentiment; label: string }> = [
  { value: 'cheap', label: 'Cheap' },
  { value: 'fair', label: 'Fair' },
  { value: 'stretched', label: 'Stretched' },
  { value: 'priced_for_perfection', label: 'Priced for perfection' },
]

function ScoreSlider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-slate-400 w-40 shrink-0">{label}</label>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-indigo-500"
      />
      <span className="text-xs font-mono text-slate-200 w-4 text-right">{value}</span>
    </div>
  )
}

function formatCap(b: number): string {
  if (b <= 0) return 'unknown'
  return b >= 1000 ? `$${(b / 1000).toFixed(1)}T` : `$${b.toFixed(1)}B`
}

export function AddCompanyModal({
  open,
  onClose,
  initialTicker,
  initialName,
  initialMarketCapB,
}: Props) {
  const { addDynamicCompany } = useAppStore()
  const { apiKey } = useApiKey()

  const [name, setName] = useState(initialName || initialTicker)
  const [description, setDescription] = useState('')
  const [layer, setLayer] = useState('')
  const [investability, setInvestability] = useState<InvestabilityType>('direct')
  const [sentiment, setSentiment] = useState<ValuationSentiment>('fair')
  const [moat, setMoat] = useState(5)
  const [revenue, setRevenue] = useState(5)
  const [balance, setBalance] = useState(5)
  const [market, setMarket] = useState(5)
  const [ceiling, setCeiling] = useState(5)
  const [optionality, setOptionality] = useState(5)
  const [prob, setProb] = useState(40)
  const [multiple, setMultiple] = useState(3)

  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [analyzed, setAnalyzed] = useState(false)

  if (!open) return null

  async function handleAnalyze() {
    if (!apiKey) {
      setAnalyzeError('No API key — click ⚿ in the header to add your Anthropic key.')
      return
    }
    setAnalyzing(true)
    setAnalyzeError(null)
    try {
      const result = await fetchAIAnalysis(initialTicker, name || initialTicker, initialMarketCapB, apiKey)
      // Fill all form fields from AI response
      if (result.name) setName(result.name)
      if (result.description) setDescription(result.description)
      if (result.suggested_layer) setLayer(result.suggested_layer)
      setMoat(result.moat_durability)
      setRevenue(result.revenue_defensibility)
      setBalance(result.balance_sheet_strength)
      setMarket(result.market_expansion)
      setCeiling(result.competitive_position_ceiling)
      setOptionality(result.strategic_optionality)
      setProb(Math.round(result.upside_probability * 100))
      setMultiple(result.upside_multiple)
      setSentiment(result.valuation_sentiment)
      setAnalyzed(true)
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : String(err))
    } finally {
      setAnalyzing(false)
    }
  }

  function handleSubmit() {
    if (!layer) return
    const today = new Date().toISOString().slice(0, 10)
    const id = initialTicker.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const company: Company = {
      id,
      name: name.trim() || initialTicker,
      ticker: initialTicker,
      exchange: null,
      layer,
      secondary_layers: [],
      is_dark_horse: false,
      is_exposure_vehicle: false,
      description: description.trim() || name.trim() || initialTicker,
      investability: { type: investability, notes: '', proxy_for: null },
      model: {
        model_updated: today,
        moat_durability: moat,
        moat_durability_rationale: 'AI-generated analysis',
        revenue_defensibility: revenue,
        revenue_defensibility_rationale: 'AI-generated analysis',
        balance_sheet_strength: balance,
        balance_sheet_rationale: 'AI-generated analysis',
        downside_scenario: 'AI-generated analysis',
        market_expansion: market,
        market_expansion_rationale: 'AI-generated analysis',
        competitive_position_ceiling: ceiling,
        competitive_position_rationale: 'AI-generated analysis',
        strategic_optionality: optionality,
        strategic_optionality_rationale: 'AI-generated analysis',
        upside_probability: prob / 100,
        upside_multiple: multiple,
        valuation_sentiment: sentiment,
      },
      fundamentals: {
        market_cap_usd_b: initialMarketCapB > 0 ? initialMarketCapB : 1,
        market_cap_date: today,
        sources: [],
      },
      strategic_dynamics: [],
      relationships: [],
    }
    addDynamicCompany(company)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-slate-100 font-semibold">Add {initialTicker} to analysis</h2>
            <p className="text-xs text-slate-500 mt-0.5">Market cap: {formatCap(initialMarketCapB)}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg leading-none">✕</button>
        </div>

        {/* AI Analyze button */}
        <div className="mb-5">
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className={[
              'w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2',
              analyzed
                ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            {analyzing ? (
              <>
                <span className="animate-spin inline-block">↻</span>
                Analyzing with Claude…
              </>
            ) : analyzed ? (
              '✓ AI analysis complete — review and adjust below'
            ) : (
              '✦ Analyze with AI'
            )}
          </button>
          {analyzeError && (
            <p className="text-xs text-rose-400 mt-2">{analyzeError}</p>
          )}
          {!apiKey && !analyzeError && (
            <p className="text-xs text-slate-500 mt-2">
              No API key set — click ⚿ in the header to add yours, or fill scores manually below.
            </p>
          )}
        </div>

        <div className="border-t border-slate-800 mb-4" />

        {/* Company info */}
        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Company name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
          {description && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Description</label>
              <p className="text-xs text-slate-400 leading-relaxed bg-slate-800 rounded p-3">{description}</p>
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Layer <span className="text-rose-400">*</span></label>
              <select
                value={layer}
                onChange={(e) => setLayer(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select layer…</option>
                {layers.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 block mb-1">Investability</label>
              <select
                value={investability}
                onChange={(e) => setInvestability(e.target.value as InvestabilityType)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {INVESTABILITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Floor scores */}
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Floor scores</p>
        <div className="space-y-2 mb-5">
          <ScoreSlider label="Moat durability" value={moat} onChange={setMoat} />
          <ScoreSlider label="Revenue defensibility" value={revenue} onChange={setRevenue} />
          <ScoreSlider label="Balance sheet" value={balance} onChange={setBalance} />
        </div>

        {/* Ceiling scores */}
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Ceiling scores</p>
        <div className="space-y-2 mb-5">
          <ScoreSlider label="Market expansion" value={market} onChange={setMarket} />
          <ScoreSlider label="Competitive ceiling" value={ceiling} onChange={setCeiling} />
          <ScoreSlider label="Strategic optionality" value={optionality} onChange={setOptionality} />
        </div>

        <div className="border-t border-slate-800 my-4" />

        {/* Upside + valuation */}
        <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">Upside + valuation</p>
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400 w-40 shrink-0">Upside probability</label>
            <input
              type="range" min={5} max={95} step={5} value={prob}
              onChange={(e) => setProb(Number(e.target.value))}
              className="flex-1 accent-indigo-500"
            />
            <span className="text-xs font-mono text-slate-200 w-8 text-right">{prob}%</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400 w-40 shrink-0">Upside multiple</label>
            <input
              type="range" min={1} max={20} step={0.5} value={multiple}
              onChange={(e) => setMultiple(Number(e.target.value))}
              className="flex-1 accent-indigo-500"
            />
            <span className="text-xs font-mono text-slate-200 w-8 text-right">{multiple}×</span>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Valuation sentiment</label>
            <select
              value={sentiment}
              onChange={(e) => setSentiment(e.target.value as ValuationSentiment)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {SENTIMENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!layer}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            Add to analysis
          </button>
        </div>
      </div>
    </div>
  )
}
