import { useState, useRef, useEffect } from 'react'
import { companies } from '../data/loader'
import { useAppStore } from '../store'

interface SearchResult {
  type: 'existing'
  companyId: string
  name: string
  ticker: string | null
  layer: string
}

export function TickerSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addStatus, setAddStatus] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { selectCompany, addPick, picks } = useAppStore()

  const q = query.trim().toUpperCase()

  const results: SearchResult[] = q.length < 1 ? [] : companies
    .filter((c) => {
      const nameMatch = c.name.toUpperCase().includes(q)
      const tickerMatch = c.ticker?.toUpperCase().includes(q)
      return nameMatch || tickerMatch
    })
    .slice(0, 8)
    .map((c) => ({
      type: 'existing',
      companyId: c.id,
      name: c.name,
      ticker: c.ticker ?? null,
      layer: c.layer,
    }))

  // Is this query a ticker that's NOT in our dataset?
  const isExternalTicker =
    q.length >= 1 &&
    q.length <= 6 &&
    /^[A-Z0-9.^-]+$/.test(q) &&
    results.length === 0

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setAddStatus(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleAddExternal() {
    if (!isExternalTicker || adding) return
    setAdding(true)
    setAddStatus('Fetching...')
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(q)}?interval=1d&range=1d`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Not found')
      const json = await res.json()
      const meta = json?.chart?.result?.[0]?.meta
      if (!meta) throw new Error('No data')
      const name: string = meta.longName ?? meta.shortName ?? q
      const marketCapB: number = meta.marketCap ? meta.marketCap / 1e9 : 0

      // Check if already picked
      const existing = picks.find((p) => {
        const c = companies.find((co) => co.id === p.companyId)
        return c?.ticker?.toUpperCase() === q
      })
      if (existing) {
        setAddStatus('Already in picks')
        return
      }

      addPick({
        id: crypto.randomUUID(),
        companyId: `external:${q}`,
        addedAt: new Date().toISOString(),
        status: 'watching',
        notes: `${name}${marketCapB > 0 ? ` · $${marketCapB >= 1000 ? (marketCapB / 1000).toFixed(1) + 'T' : marketCapB.toFixed(0) + 'B'} market cap` : ''} · Added manually`,
      })
      setAddStatus(`Added ${q} to picks`)
      setQuery('')
      setTimeout(() => { setOpen(false); setAddStatus(null) }, 1500)
    } catch {
      setAddStatus('Not found or unavailable')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Search or add ticker..."
        className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48"
      />

      {open && (query.length > 0) && (
        <div className="absolute top-full mt-1 left-0 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {results.length > 0 && (
            <ul>
              {results.map((r) => {
                const picked = picks.some((p) => p.companyId === r.companyId)
                return (
                  <li key={r.companyId}>
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors flex items-center justify-between gap-2"
                      onClick={() => {
                        selectCompany(r.companyId)
                        setQuery('')
                        setOpen(false)
                      }}
                    >
                      <div>
                        <span className="text-slate-100 text-xs">{r.name}</span>
                        {r.ticker && (
                          <span className="text-slate-400 text-xs font-mono ml-2">{r.ticker}</span>
                        )}
                      </div>
                      {picked && <span className="text-slate-500 text-xs">in picks</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {isExternalTicker && (
            <div className="px-3 py-2 border-t border-slate-700">
              {addStatus ? (
                <span className="text-xs text-slate-400">{addStatus}</span>
              ) : (
                <button
                  onClick={handleAddExternal}
                  disabled={adding}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                >
                  {adding ? 'Fetching...' : `+ Add ${q} to picks (external ticker)`}
                </button>
              )}
            </div>
          )}

          {results.length === 0 && !isExternalTicker && (
            <div className="px-3 py-2 text-xs text-slate-500">No matches</div>
          )}
        </div>
      )}
    </div>
  )
}
