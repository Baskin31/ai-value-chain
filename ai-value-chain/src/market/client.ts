import { useQuery } from '@tanstack/react-query'

// Yahoo Finance unofficial endpoint
// Returns current price and market cap data for a ticker
async function fetchYahooQuote(ticker: string): Promise<{ price: number; marketCapB: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()
    const meta = json?.chart?.result?.[0]?.meta
    if (!meta) return null
    const price = meta.regularMarketPrice ?? null
    const marketCap = meta.marketCap ?? null
    if (price === null) return null
    return {
      price,
      marketCapB: marketCap != null ? marketCap / 1e9 : 0,
    }
  } catch {
    return null
  }
}

async function fetchMultipleQuotes(
  tickers: string[]
): Promise<Record<string, { price: number; marketCapB: number }>> {
  const results = await Promise.allSettled(
    tickers.map(async (ticker) => {
      const data = await fetchYahooQuote(ticker)
      return { ticker, data }
    })
  )
  const out: Record<string, { price: number; marketCapB: number }> = {}
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.data) {
      out[r.value.ticker] = r.value.data
    }
  }
  return out
}

// Hook: fetch live quotes for a list of tickers
// Returns a map of ticker -> { price, marketCapB }
// Gracefully returns empty object if all fetches fail
export function useMarketQuotes(tickers: string[]) {
  return useQuery({
    queryKey: ['market-quotes', tickers],
    queryFn: () => fetchMultipleQuotes(tickers),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    enabled: tickers.length > 0,
  })
}

// Hook: refresh YAML data from VITE_DATA_SOURCE_URL if set
// Returns a trigger function and loading state
export function useRefreshFromSource() {
  const sourceUrl = import.meta.env.VITE_DATA_SOURCE_URL as string | undefined

  return useQuery({
    queryKey: ['source-refresh'],
    queryFn: async () => {
      if (!sourceUrl) return null
      // Ping the source URL to check availability
      const res = await fetch(`${sourceUrl}/data/layers.yaml`, { method: 'HEAD' })
      return res.ok ? sourceUrl : null
    },
    enabled: false, // Only runs when manually triggered via refetch()
    retry: 0,
  })
}
