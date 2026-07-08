import { useState } from 'react'
import type { View } from '../../store'
import { useAppStore } from '../../store'
import { TickerSearch } from '../TickerSearch'
import { ModelWeightsPanel } from '../ModelWeightsPanel'

const NAV_ITEMS: { id: View; label: string }[] = [
  { id: 'stack', label: 'Stack' },
  { id: 'scatter', label: 'Scatter' },
  { id: 'ranking', label: 'Ranking' },
  { id: 'picks', label: 'My Picks' },
]

interface HeaderProps {
  view: View
  onViewChange: (v: View) => void
}

export function Header({ view, onViewChange }: HeaderProps) {
  const [weightsOpen, setWeightsOpen] = useState(false)
  const { weightOverrides } = useAppStore()
  const hasOverrides = Object.keys(weightOverrides).length > 0

  return (
    <>
    <header className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-slate-100 font-semibold tracking-tight text-sm">
          AI Value Chain
        </span>
        <span className="text-slate-600 text-xs hidden sm:inline">
          from the mine to the harness
        </span>
      </div>

      <div className="flex items-center gap-3">
        <nav className="flex gap-1">
          {NAV_ITEMS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              className={[
                'px-3 py-1.5 rounded text-sm transition-colors',
                view === id
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => setWeightsOpen(true)}
            className={[
              'px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-1.5',
              hasOverrides
                ? 'bg-amber-900/40 text-amber-300 hover:bg-amber-900/60'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
            ].join(' ')}
          >
            &#x2699;
            {hasOverrides && <span className="text-xs">(mod)</span>}
          </button>
        </nav>
        <div className="ml-2">
          <TickerSearch />
        </div>
      </div>
    </header>
    <ModelWeightsPanel open={weightsOpen} onClose={() => setWeightsOpen(false)} />
    </>
  )
}
