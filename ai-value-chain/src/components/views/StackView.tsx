import { useMemo } from 'react'
import { companies, layers } from '../../data/loader'
import { useAppStore } from '../../store'
import { useScoredCompanies } from '../../hooks/useScoredCompanies'
import { CompanyCard } from '../company/CompanyCard'
import type { ScoredCompany } from '../../model'
import type { Layer } from '../../schema/types'

export function StackView() {
  const { activeLayerIds } = useAppStore()
  const allScored = useScoredCompanies()

  // Build a map from company id to scored entry
  const scoredMap = useMemo(() => {
    const map = new Map<string, ScoredCompany>()
    for (const entry of allScored) {
      map.set(entry.company.id, entry)
    }
    return map
  }, [allScored])

  // Sort layers by order
  const sortedLayers = useMemo(
    () => [...layers].sort((a, b) => a.order - b.order),
    []
  )

  // Filter layers
  const visibleLayers = useMemo(
    () =>
      activeLayerIds.length === 0
        ? sortedLayers
        : sortedLayers.filter((l) => activeLayerIds.includes(l.id)),
    [sortedLayers, activeLayerIds]
  )

  // Group companies by layer (include secondary_layers)
  const companiesByLayer = useMemo(() => {
    const map = new Map<string, ScoredCompany[]>()
    for (const layer of sortedLayers) {
      map.set(layer.id, [])
    }
    for (const company of companies) {
      const layerIds = [company.layer, ...(company.secondary_layers ?? [])]
      for (const layerId of layerIds) {
        const scored = scoredMap.get(company.id)
        // For companies without a model (ETFs), create a minimal ScoredCompany
        const entry: ScoredCompany = scored ?? {
          company,
          floorScore: 0,
          ceilingRaw: 0,
          ceilingAdjusted: 0,
          effectiveMultiple: 0,
          ev: 0,
          entryScore: 0,
          currentMarketCapB: company.fundamentals.market_cap_usd_b,
          isMarketDataStale: false,
          isModelStale: false,
        }
        const existing = map.get(layerId)
        if (existing) {
          existing.push(entry)
        }
      }
    }
    // Sort each layer by entryScore descending
    for (const [, arr] of map) {
      arr.sort((a, b) => b.entryScore - a.entryScore)
    }
    return map
  }, [scoredMap, sortedLayers])

  // Build a quick lookup for layer accent colors
  const layerColorMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const l of layers) m.set(l.id, l.accent_color)
    return m
  }, [])

  return (
    <div className="p-4 space-y-6">
      {visibleLayers.map((layer: Layer) => {
        const layerCompanies = companiesByLayer.get(layer.id) ?? []
        if (layerCompanies.length === 0) return null

        return (
          <section key={layer.id}>
            {/* Layer header */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: layer.accent_color }}
              />
              <h2 className="text-slate-100 font-semibold text-sm">{layer.name}</h2>
              <span className="text-slate-500 text-xs">
                {layerCompanies.length} {layerCompanies.length === 1 ? 'company' : 'companies'}
              </span>
            </div>

            {/* Company cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {layerCompanies.map((scored) => (
                <CompanyCard
                  key={`${layer.id}-${scored.company.id}`}
                  scored={scored}
                  accentColor={layerColorMap.get(layer.id) ?? '#6366f1'}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
