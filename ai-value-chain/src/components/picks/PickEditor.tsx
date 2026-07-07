import { useState } from 'react'
import { companies } from '../../data/loader'
import { useAppStore } from '../../store'

export function PickEditor() {
  const [selectedId, setSelectedId] = useState('')
  const { addPick, picks } = useAppStore()

  const available = companies.filter(
    (c) => !picks.some((p) => p.companyId === c.id)
  )

  function handleAdd() {
    if (!selectedId) return
    addPick({
      id: crypto.randomUUID(),
      companyId: selectedId,
      addedAt: new Date().toISOString(),
      status: 'watching',
      notes: '',
    })
    setSelectedId('')
  }

  return (
    <div className="flex gap-2 mb-6">
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="flex-1 bg-slate-800 text-slate-300 text-sm rounded px-3 py-1.5 border border-slate-700 focus:border-indigo-500 focus:outline-none"
      >
        <option value="">Add a company to picks...</option>
        {available.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}{c.ticker ? ` (${c.ticker})` : ''}
          </option>
        ))}
      </select>
      <button
        onClick={handleAdd}
        disabled={!selectedId}
        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm px-4 py-1.5 rounded transition-colors"
      >
        Add
      </button>
    </div>
  )
}
