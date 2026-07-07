import { useAppStore } from '../../store'
import type { ScoredCompany } from '../../model'

const INVESTABILITY_BADGE: Record<string, { label: string; color: string }> = {
  direct: { label: 'Direct', color: 'bg-emerald-900 text-emerald-300' },
  adr: { label: 'ADR', color: 'bg-blue-900 text-blue-300' },
  proxy: { label: 'Proxy', color: 'bg-violet-900 text-violet-300' },
  hk_stock_connect: { label: 'HK Connect', color: 'bg-rose-900 text-rose-300' },
  etf_bucket: { label: 'ETF', color: 'bg-sky-900 text-sky-300' },
  uninvestable: { label: 'Unlisted', color: 'bg-slate-800 text-slate-400' },
}

interface CompanyCardProps {
  scored: ScoredCompany
  accentColor: string
}

export function CompanyCard({ scored, accentColor: _accentColor }: CompanyCardProps) {
  const { company, floorScore, ceilingAdjusted, entryScore, isMarketDataStale, isModelStale } = scored
  const { selectCompany, addPick, picks } = useAppStore()
  const badge = INVESTABILITY_BADGE[company.investability.type]
  const alreadyPicked = picks.some((p) => p.companyId === company.id)

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

  const isStale = isMarketDataStale || isModelStale

  return (
    <div
      className="group bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-lg p-3 cursor-pointer transition-colors"
      onClick={() => selectCompany(company.id)}
    >
      {/* Top row: name + badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {company.is_dark_horse && (
            <span className="text-amber-400 text-xs shrink-0" title="Dark horse">◆</span>
          )}
          <span className="text-slate-100 text-sm font-medium truncate">
            {company.name}
          </span>
          {company.ticker && (
            <span className="text-slate-500 text-xs font-mono shrink-0">{company.ticker}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isStale && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Stale data" />
          )}
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${badge.color}`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Score bars */}
      {company.model && (
        <div className="space-y-1 mb-2">
          {/* Floor bar — blue */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs w-12 shrink-0">Floor</span>
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${(floorScore / 10) * 100}%` }}
              />
            </div>
            <span className="text-slate-400 text-xs font-mono w-8 text-right">
              {floorScore.toFixed(1)}
            </span>
          </div>
          {/* Ceiling bar — amber */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs w-12 shrink-0">Ceiling</span>
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${(ceilingAdjusted / 10) * 100}%` }}
              />
            </div>
            <span className="text-slate-400 text-xs font-mono w-8 text-right">
              {ceilingAdjusted.toFixed(1)}
            </span>
          </div>
        </div>
      )}

      {/* Bottom row: entry score + add pick */}
      <div className="flex items-center justify-between">
        {company.model ? (
          <span className="text-indigo-400 text-xs font-mono">
            Entry: {entryScore.toFixed(2)}
          </span>
        ) : (
          <span className="text-slate-600 text-xs">Exposure vehicle</span>
        )}
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
