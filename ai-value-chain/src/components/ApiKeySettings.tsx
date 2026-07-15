import { useState, useRef, useEffect } from 'react'
import { useApiKey } from '../hooks/useApiKey'

export function ApiKeySettings() {
  const { apiKey, setApiKey } = useApiKey()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Populate draft when panel opens
  useEffect(() => {
    if (open) {
      setDraft(apiKey)
      setSaved(false)
    }
  }, [open, apiKey])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSave() {
    setApiKey(draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleClear() {
    setApiKey('')
    setDraft('')
  }

  const hasKey = apiKey.length > 0

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={[
          'px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-1.5',
          hasKey
            ? 'text-emerald-400 hover:bg-slate-800'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
        ].join(' ')}
        title={hasKey ? 'Anthropic API key set' : 'Set Anthropic API key for AI analysis'}
      >
        <span>⚿</span>
        <span className="text-xs hidden sm:inline">{hasKey ? 'API key set' : 'API key'}</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 z-50">
          <h3 className="text-slate-100 text-sm font-medium mb-1">Anthropic API key</h3>
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            Your key is stored in this browser only and sent directly to Claude for AI analysis.
            It is never stored on any server.{' '}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 underline"
            >
              Get a key →
            </a>
          </p>
          <input
            type="password"
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setSaved(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            placeholder="sk-ant-..."
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500 mb-3"
          />
          <div className="flex items-center justify-between gap-2">
            {hasKey && (
              <button
                onClick={handleClear}
                className="text-xs text-slate-500 hover:text-rose-400 transition-colors"
              >
                Clear key
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              {saved && <span className="text-xs text-emerald-400">Saved</span>}
              <button
                onClick={handleSave}
                disabled={!draft.trim()}
                className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
