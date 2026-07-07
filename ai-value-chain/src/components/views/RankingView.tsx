import { useState, useMemo } from 'react'
import { companies, layers, modelConfig } from '../../data/loader'
import { scoreCompany } from '../../model'
import { useAppStore } from '../../store'
import type { ScoredCompany } from '../../model'

type SortKey = 'entryScore' | 'floorScore' | 'ceilingAdjusted' | 'currentMarketCapB'
type SortDir = 'asc' | 'desc'

const SENTIMENT_COLOR: Record<string, string> = {
  cheap: 'bg-emerald-900 text-emerald-300',
  fair: 'bg-slate-800 text-slate-300',
  stretched: 'bg-amber-900 text-amber-300',
  priced_for_perfection: 'bg-rose-900 text-rose-300',
}

const SENTIMENT_SHORT: Record<string, string> = {
  cheap: 'Cheap',
  fair: 'Fair',
  stretched: 'Stretched',
  priced_for_perfection: 'PFP',
}

const INVESTABILITY_SHORT: Record<string, string> = {
  direct: 'Direct',
  adr: 'ADR',
  proxy: 'Proxy',
  hk_stock_connect: 'HK',
  etf_bucket: 'ETF',
  uninvestable: 'Unlisted',
}

const INVESTABILITY_COLOR: Record<string, string> = {
  direct: 'bg-emerald-900 text-emerald-300',
  adr: 'bg-blue-900 text-blue-300',
  proxy: 'bg-violet-900 text-violet-300',
  hk_stock_connect: 'bg-rose-900 text-rose-300',
  etf_bucket: 'bg-sky-900 text-sky-300',
  uninvestable: 'bg-slate-800 text-slate-400',
}

export function RankingView() {
  const [sortKey, setSortKey] = useState<SortKey>('entryScore')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const { activeLayerIds, selectCompany, addPick, picks } = useAppStore()

  // Layer lookup maps
  const layerNameMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const l of layers) m.set(l.id, l.name)
    return m
  }, [])

  const layerColorMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const l of layers) m.set(l.id, l.accent_color)
    return m
  }, [])

  // Score all companies with a model
  const scored: ScoredCompany[] = useMemo(() => {
    return companies
      .filter((c) => c.model)
      .map((c) => scoreCompany(c, modelConfig))
  }, [])

  // Filter by active layers
  const filtered = useMemo(() => {
    if (activeLayerIds.length === 0) return scored
    return scored.filter((s) => activeLayerIds.includes(s.company.layer))
  }, [scored, activeLayerIds])

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      return sortDir === 'desc' ? bv - av : av - bv
    })
  }, [filtered, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function SortHeader({ label, sKey }: { label: string; sKey: SortKey }) {
    const active = sortKey === sKey
    return (
      <th
        className="px-3 py-2 text-left text-xs text-slate-400 cursor-pointer hover:text-slate-100 select-none whitespace-nowrap"
        onClick={() => handleSort(sKey)}
      >
        {label}
        <span className="ml-1 text-slate-600">{active ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}</span>
      </th>
    )
  }

  return (
    <div className="p-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="px-3 py-2 text-left text-xs text-slate-400 w-8">#</th>
              <th className="px-3 py-2 text-left text-xs text-slate-400">Company</th>
              <th className="px-3 py-2 text-left text-xs text-slate-400">Layer</th>
              <SortHeader label="Floor" sKey="floorScore" />
              <SortHeader label="Ceiling" sKey="ceilingAdjusted" />
              <SortHeader label="Entry" sKey="entryScore" />
              <th className="px-3 py-2 text-left text-xs text-slate-400">Valuation</th>
              <th className="px-3 py-2 text-left text-xs text-slate-400">Investability</th>
              <SortHeader label="Mkt Cap" sKey="currentMarketCapB" />
              <th className="px-3 py-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => {
              const c = s.company
              const alreadyPicked = picks.some((p) => p.companyId === c.id)
              return (
                <tr
                  key={c.id}
                  className="border-b border-slate-900 hover:bg-slate-900 cursor-pointer transition-colors"
                  onClick={() => selectCompany(c.id)}
                >
                  <td className="px-3 py-2 text-slate-600 font-mono text-xs">{i + 1}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {c.is_dark_horse && <span className="text-amber-400 text-xs">◆</span>}
                      <span className="text-slate-100">{c.name}</span>
                      {c.ticker && (
                        <span className="text-slate-500 font-mono text-xs">{c.ticker}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: layerColorMap.get(c.layer) ?? '#6366f1' }}
                      />
                      <span className="text-slate-400 text-xs whitespace-nowrap">
                        {layerNameMap.get(c.layer) ?? c.layer}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-blue-400">
                    {s.floorScore.toFixed(1)}
                    {s.isMarketDataStale && <span className="text-amber-400 ml-1">⚠</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-amber-400">{s.ceilingAdjusted.toFixed(1)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-indigo-400 font-semibold">{s.entryScore.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${SENTIMENT_COLOR[c.model!.valuation_sentiment]}`}>
                      {SENTIMENT_SHORT[c.model!.valuation_sentiment]}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${INVESTABILITY_COLOR[c.investability.type]}`}>
                      {INVESTABILITY_SHORT[c.investability.type]}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-300">
                    ${s.currentMarketCapB >= 1000
                      ? `${(s.currentMarketCapB / 1000).toFixed(1)}T`
                      : `${s.currentMarketCapB.toFixed(0)}B`}
                  </td>
                  <td
                    className="px-3 py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      disabled={alreadyPicked}
                      onClick={() => {
                        if (alreadyPicked) return
                        addPick({
                          id: crypto.randomUUID(),
                          companyId: c.id,
                          addedAt: new Date().toISOString(),
                          status: 'watching',
                          notes: '',
                        })
                      }}
                      className={[
                        'text-xs px-2 py-0.5 rounded transition-colors',
                        alreadyPicked
                          ? 'text-slate-600 cursor-default'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
                      ].join(' ')}
                    >
                      {alreadyPicked ? '✓' : '+'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-sm">
            No companies match the active layer filter.
          </div>
        )}
      </div>
    </div>
  )
}
