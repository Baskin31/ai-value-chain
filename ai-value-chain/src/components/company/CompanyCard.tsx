import { Tooltip } from '../Tooltip'
import { useAppStore } from '../../store'
import { differenceInDays, parseISO } from 'date-fns'
import type { ScoredCompany } from '../../model'

function formatCap(b: number): string {
  if (b >= 1000) return `$${(b / 1000).toFixed(1)}T`
  return `$${b.toFixed(0)}B`
}

const INVESTABILITY_BADGE: Record<string, { label: string; color: string; detail: string }> = {
  direct: { label: 'Direct', color: 'bg-emerald-900 text-emerald-300', detail: 'Listed on US exchange — buy directly' },
  adr: { label: 'ADR', color: 'bg-blue-900 text-blue-300', detail: 'US-listed ADR — buy via standard broker' },
  proxy: { label: 'Proxy', color: 'bg-violet-900 text-violet-300', detail: 'No direct US listing — buy closest proxy' },
  hk_stock_connect: { label: 'HK Connect', color: 'bg-rose-900 text-rose-300', detail: 'Accessible via HK Stock Connect' },
  etf_bucket: { label: 'ETF', color: 'bg-sky-900 text-sky-300', detail: 'ETF — indirect basket exposure' },
  uninvestable: { label: 'Unlisted', color: 'bg-slate-800 text-slate-400', detail: 'Private — no public market access' },
}

interface CompanyCardProps {
  scored: ScoredCompany
  accentColor: string
}

export function CompanyCard({ scored, accentColor }: CompanyCardProps) {
  const {
    company,
    floorScore, entryScore,
    floorMarketCapB, ceilingMarketCapB, currentMarketCapB,
    expectedReturnMultiple, vsVooReturn,
    scenarioBreakdown,
    isMarketDataStale, isModelStale,
  } = scored
  const { selectCompany, addPick, picks } = useAppStore()
  const badge = INVESTABILITY_BADGE[company.investability.type]
  const alreadyPicked = picks.some((p) => p.companyId === company.id)

  // Staleness tooltip text
  const stalenessTooltip = [
    isMarketDataStale
      ? `Market data ${differenceInDays(new Date(), parseISO(company.fundamentals.market_cap_date))}d old`
      : null,
    isModelStale
      ? `Model ${differenceInDays(new Date(), parseISO(company.model!.model_updated))}d old`
      : null,
  ].filter(Boolean).join(' · ')

  const isStale = isMarketDataStale || isModelStale

  function handleAddPick(e: React.MouseEvent) {
    e.stopPropagation()
    if (alreadyPicked) return
    addPick({
      id: crypto.randomUUID(),
      companyId: company.id,
      addedAt: new Date().toISOString(),
      status: 'watching',
      notes: '',
    })
  }

  // Investability proxy detail
  const investDetail = company.investability.type === 'proxy' && company.investability.proxy_for
    ? `Proxy: ${company.investability.proxy_for}`
    : company.investability.notes ?? badge.detail

  return (
    <div
      className="group bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-lg p-3 cursor-pointer transition-colors"
      style={{ borderLeftColor: accentColor, borderLeftWidth: 2 }}
      onClick={() => selectCompany(company.id)}
    >
      {/* Row 1: name + badges */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {company.is_dark_horse && (
            <Tooltip content="Dark horse — contrarian pick with outsized upside potential">
              <span className="text-amber-400 text-xs shrink-0">◆</span>
            </Tooltip>
          )}
          <span className="text-slate-100 text-sm font-medium truncate">{company.name}</span>
          {company.ticker && (
            <span className="text-slate-500 text-xs font-mono shrink-0">{company.ticker}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isStale && (
            <Tooltip content={stalenessTooltip}>
              <span className="text-amber-400 text-xs">⚠</span>
            </Tooltip>
          )}
          <Tooltip content={investDetail}>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium cursor-default ${badge.color}`}>
              {badge.label}
            </span>
          </Tooltip>
        </div>
      </div>

      {/* Row 2: market cap range */}
      {company.model && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="text-blue-400">Floor {formatCap(floorMarketCapB)}</span>
            <span className="text-slate-400">{formatCap(currentMarketCapB)} now</span>
            <span className="text-amber-400">Ceil {formatCap(ceilingMarketCapB)}</span>
          </div>
          {/* Range bar showing current position between floor and ceiling */}
          <div className="relative h-1 bg-slate-800 rounded-full">
            <div
              className="absolute left-0 top-0 h-full bg-blue-800 rounded-l-full"
              style={{ width: `${(floorScore / 10) * 100}%` }}
            />
            <div
              className="absolute top-0 h-full bg-amber-800 rounded-r-full"
              style={{
                left: `${Math.min((currentMarketCapB / (ceilingMarketCapB || currentMarketCapB * 2)) * 100, 90)}%`,
                right: 0,
              }}
            />
            <div
              className="absolute top-0 h-full w-0.5 bg-slate-100"
              style={{
                left: `${Math.min((currentMarketCapB / (ceilingMarketCapB || currentMarketCapB * 2)) * 100, 98)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Row 3: expected return + vs VOO */}
      {company.model && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">Expected:</span>
            <span className="text-indigo-400 text-xs font-mono font-semibold">
              ×{expectedReturnMultiple.toFixed(2)}
            </span>
          </div>
          <span className={`text-xs font-mono ${vsVooReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {vsVooReturn >= 0 ? '+' : ''}{(vsVooReturn * 100).toFixed(0)}% vs VOO
          </span>
        </div>
      )}

      {/* Row 4: scenario breakdown bar */}
      {company.model && (
        <div className="mb-2">
          <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
            <Tooltip content={`Impaired: ${(scenarioBreakdown.impaired * 100).toFixed(0)}%`}>
              <span
                className="h-full bg-rose-700 block"
                style={{ width: `${scenarioBreakdown.impaired * 100}%` }}
              />
            </Tooltip>
            <Tooltip content={`Flat: ${(scenarioBreakdown.flat * 100).toFixed(0)}%`}>
              <span
                className="h-full bg-slate-600 block"
                style={{ width: `${scenarioBreakdown.flat * 100}%` }}
              />
            </Tooltip>
            <Tooltip content={`Strong: ${(scenarioBreakdown.strong * 100).toFixed(0)}%`}>
              <span
                className="h-full bg-blue-600 block"
                style={{ width: `${scenarioBreakdown.strong * 100}%` }}
              />
            </Tooltip>
            <Tooltip content={`Transformative: ${(scenarioBreakdown.transformative * 100).toFixed(0)}%`}>
              <span
                className="h-full bg-amber-500 block"
                style={{ width: `${scenarioBreakdown.transformative * 100}%` }}
              />
            </Tooltip>
          </div>
          <div className="flex justify-between text-xs text-slate-600 mt-0.5">
            <span>Impaired</span>
            <span>Flat</span>
            <span>Strong</span>
            <span>Transformative</span>
          </div>
        </div>
      )}

      {/* Row 5: moat rationale snippet */}
      {company.model?.moat_durability_rationale && (
        <p className="text-slate-500 text-xs leading-relaxed mb-2 line-clamp-2">
          {company.model.moat_durability_rationale}
        </p>
      )}

      {/* Row 6: investability detail */}
      {company.investability.notes && (
        <p className="text-slate-600 text-xs italic mb-2 line-clamp-1">
          {company.investability.notes}
        </p>
      )}

      {/* Row 7: bottom bar */}
      <div className="flex items-center justify-between">
        <span className="text-slate-600 text-xs font-mono">Entry: {entryScore.toFixed(2)}</span>
        <button
          onClick={handleAddPick}
          disabled={alreadyPicked}
          className={[
            'text-xs px-2 py-0.5 rounded transition-colors',
            alreadyPicked
              ? 'text-slate-600 cursor-default'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
          ].join(' ')}
        >
          {alreadyPicked ? '✓ picked' : '+ pick'}
        </button>
      </div>
    </div>
  )
}
