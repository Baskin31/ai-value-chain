import { useState } from 'react'
import { useAppStore } from '../../store'
import { companies } from '../../data/loader'
import type { Pick as WatchPick } from '../../store'

const STATUS_OPTIONS: WatchPick['status'][] = ['watching', 'positioned', 'exited']
const STATUS_COLOR: Record<WatchPick['status'], string> = {
  watching: 'text-blue-400',
  positioned: 'text-emerald-400',
  exited: 'text-slate-500',
}

interface PickCardProps {
  pick: WatchPick
}

export function PickCard({ pick }: PickCardProps) {
  const { updatePick, removePick, selectCompany } = useAppStore()
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(pick.notes)

  const company = companies.find((c) => c.id === pick.companyId)
  if (!company) return null

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <button
            className="text-slate-100 font-medium text-sm hover:text-indigo-400 transition-colors"
            onClick={() => selectCompany(company.id)}
          >
            {company.name}
          </button>
          {company.ticker && (
            <span className="ml-2 text-slate-500 font-mono text-xs">{company.ticker}</span>
          )}
          <div className="text-slate-600 text-xs mt-0.5">
            Added {new Date(pick.addedAt).toLocaleDateString()}
          </div>
        </div>
        <button
          onClick={() => removePick(pick.id)}
          className="text-slate-600 hover:text-rose-400 transition-colors text-xs shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Status selector */}
      <div className="flex gap-1.5 mb-3">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => updatePick(pick.id, { status: s })}
            className={[
              'text-xs px-2 py-0.5 rounded capitalize transition-colors',
              pick.status === s
                ? `${STATUS_COLOR[s]} bg-slate-800`
                : 'text-slate-600 hover:text-slate-400',
            ].join(' ')}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Notes (click to edit) */}
      {editingNotes ? (
        <textarea
          autoFocus
          value={notesValue}
          onChange={(e) => setNotesValue(e.target.value)}
          onBlur={() => {
            updatePick(pick.id, { notes: notesValue })
            setEditingNotes(false)
          }}
          className="w-full bg-slate-800 text-slate-300 text-xs rounded p-2 resize-none h-20 border border-slate-700 focus:border-indigo-500 focus:outline-none"
          placeholder="Why are you watching this?"
        />
      ) : (
        <div
          className="text-slate-500 text-xs cursor-pointer hover:text-slate-300 transition-colors min-h-[2rem] rounded p-1 hover:bg-slate-800"
          onClick={() => setEditingNotes(true)}
        >
          {pick.notes || <span className="italic">Click to add notes...</span>}
        </div>
      )}

      {/* Target price */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-slate-500 text-xs">Target cap $B:</span>
        <input
          type="number"
          min="0"
          step="0.1"
          value={pick.targetPriceB ?? ''}
          onChange={(e) => {
            const val = parseFloat(e.target.value)
            updatePick(pick.id, { targetPriceB: isNaN(val) ? undefined : val })
          }}
          className="bg-slate-800 text-slate-300 text-xs font-mono rounded px-2 py-0.5 w-24 border border-slate-700 focus:border-indigo-500 focus:outline-none"
          placeholder="optional"
        />
      </div>
    </div>
  )
}
