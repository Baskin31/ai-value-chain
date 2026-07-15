import { useState, useRef, useEffect } from 'react'
import { companies } from '../data/loader'
import { useAppStore } from '../store'
import { fetchSingleQuote } from '../market/client'
import { AddCompanyModal } from './AddCompanyModal'

interface SearchResult {
  type: 'existing'
  companyId: string
  name: string
  ticker: string | null
  layer: string
}

interface ModalData {
  ticker: string
  name: string
  marketCapB: number
}

export function TickerSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [fetchStatus, setFetchStatus] = useState<string | null>(null)
  const [modalData, setModalData] = useState<ModalData | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { selectCompany, dynamicCompanies } = useAppStore()

  const q = query.trim().toUpperCase()

  const allCompanies = [...companies, ...dynamicCompanies]

  const results: SearchResult[] = q.length < 1 ? [] : allCompanies
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

  // Unknown ticker — not yet in our dataset (static or dynamic)
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
        setFetchStatus(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleAddExternal() {
    if (!isExternalTicker || fetching) return
    setFetching(true)
    setFetchStatus('Fetching…')
    try {
      const data = await fetchSingleQuote(q)
      if (!data) throw new Error('Not found')
      setOpen(false)
      setQuery('')
      setFetchStatus(null)
      setModalData({ ticker: q, name: data.name, marketCapB: data.marketCapB })
    } catch {
      setFetchStatus('Not found or unavailable')
    } finally {
      setFetching(false)
    }
  }

  return (
    <>
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

        {open && query.length > 0 && (
          <div className="absolute top-full mt-1 left-0 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
            {results.length > 0 && (
              <ul>
                {results.map((r) => (
                  <li key={r.companyId}>
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors flex items-center gap-2"
                      onClick={() => {
                        selectCompany(r.companyId)
                        setQuery('')
                        setOpen(false)
                      }}
                    >
                      <span className="text-slate-100 text-xs">{r.name}</span>
                      {r.ticker && (
                        <span className="text-slate-400 text-xs font-mono">{r.ticker}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {isExternalTicker && (
              <div className="px-3 py-2 border-t border-slate-700">
                {fetchStatus ? (
                  <span className="text-xs text-slate-400">{fetchStatus}</span>
                ) : (
                  <button
                    onClick={handleAddExternal}
                    disabled={fetching}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                  >
                    {fetching ? 'Fetching…' : `+ Add ${q} to analysis`}
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

      {modalData && (
        <AddCompanyModal
          key={modalData.ticker}
          open={true}
          onClose={() => setModalData(null)}
          initialTicker={modalData.ticker}
          initialName={modalData.name}
          initialMarketCapB={modalData.marketCapB}
        />
      )}
    </>
  )
}
