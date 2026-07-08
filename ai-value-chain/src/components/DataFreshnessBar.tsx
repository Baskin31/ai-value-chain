import { useEffect, useMemo } from 'react'
import { differenceInDays, differenceInMinutes, differenceInHours, parseISO } from 'date-fns'
import { companies } from '../data/loader'
import { useAppStore } from '../store'
import { useMarketQuotes } from '../market/client'

function computeDataAges() {
  const today = new Date()
  const marketCapAges = companies.map((c) =>
    differenceInDays(today, parseISO(c.fundamentals.market_cap_date))
  )
  const modelAges = companies
    .filter((c) => c.model)
    .map((c) => differenceInDays(today, parseISO(c.model!.model_updated)))

  const maxMarketCapAge = Math.max(...marketCapAges, 0)
  const maxModelAge = Math.max(...modelAges, 0)
  return { maxMarketCapAge, maxModelAge }
}

function formatLastRefreshed(lastRefreshedAt: string | null): string {
  if (!lastRefreshedAt) return 'never'
  const ts = parseISO(lastRefreshedAt)
  const now = new Date()
  const mins = differenceInMinutes(now, ts)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = differenceInHours(now, ts)
  return `${hrs}h ago`
}

export function DataFreshnessBar() {
  const { setLiveMarketCap, setLastRefreshedAt, lastRefreshedAt } = useAppStore()
  const tickers = useMemo(() => companies.filter((c) => c.ticker).map((c) => c.ticker!), [])
  const { data, isFetching, refetch } = useMarketQuotes(tickers)

  useEffect(() => {
    if (!data) return
    for (const [ticker, quote] of Object.entries(data)) {
      if (quote.marketCapB > 0) setLiveMarketCap(ticker, quote.marketCapB)
    }
    setLastRefreshedAt(new Date().toISOString())
  }, [data, setLiveMarketCap, setLastRefreshedAt])

  const { maxMarketCapAge, maxModelAge } = computeDataAges()
  const marketStale = maxMarketCapAge > 21
  const modelStale = maxModelAge > 90

  return (
    <div className="flex items-center gap-4 px-4 py-1.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 font-mono">
      <span className={marketStale ? 'text-amber-400' : 'text-slate-400'}>
        Price data: {maxMarketCapAge}d old{marketStale ? ' ⚠' : ''}
      </span>
      <span className="text-slate-600">|</span>
      <span className={modelStale ? 'text-amber-400' : 'text-slate-400'}>
        Model: {maxModelAge}d old{modelStale ? ' ⚠' : ''}
      </span>
      <span className="text-slate-600">|</span>
      <span className="text-slate-400">
        Last refreshed: {formatLastRefreshed(lastRefreshedAt)}
      </span>
      <button
        onClick={() => void refetch()}
        disabled={isFetching}
        className="flex items-center gap-1 px-2 py-0.5 rounded border border-slate-700 hover:border-slate-500 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Refresh live market data"
      >
        <span className={isFetching ? 'animate-spin inline-block' : 'inline-block'}>↻</span>
        <span>{isFetching ? 'Refreshing…' : 'Refresh'}</span>
      </button>
    </div>
  )
}
