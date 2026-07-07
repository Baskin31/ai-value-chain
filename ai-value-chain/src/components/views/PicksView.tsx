import { useRef } from 'react'
import { useAppStore } from '../../store'
import { PickCard } from '../picks/PickCard'
import { PickEditor } from '../picks/PickEditor'
import type { Pick as WatchPick } from '../../store'

const STATUS_GROUPS: { status: WatchPick['status']; label: string }[] = [
  { status: 'positioned', label: 'Positioned' },
  { status: 'watching', label: 'Watching' },
  { status: 'exited', label: 'Exited' },
]

export function PicksView() {
  const { picks, exportPicks, importPicks } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    const json = exportPicks()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ai-value-chain-picks.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (text) importPicks(text)
    }
    reader.readAsText(file)
    // Reset so same file can be re-imported
    e.target.value = ''
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-slate-100 font-semibold text-lg">My Picks</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={picks.length === 0}
            className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:text-slate-600 text-slate-300 rounded transition-colors"
          >
            ↓ Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
          >
            ↑ Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
      </div>

      {/* Add pick form */}
      <PickEditor />

      {/* Empty state */}
      {picks.length === 0 && (
        <div className="py-12 text-center text-slate-500 text-sm">
          No picks yet. Add companies from the Stack, Scatter, or Ranking views.
        </div>
      )}

      {/* Grouped picks */}
      {STATUS_GROUPS.map(({ status, label }) => {
        const group = picks.filter((p) => p.status === status)
        if (group.length === 0) return null
        return (
          <section key={status} className="mb-6">
            <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-3">
              {label} ({group.length})
            </h2>
            <div className="space-y-3">
              {group.map((pick) => (
                <PickCard key={pick.id} pick={pick} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
