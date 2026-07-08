import { useQuery } from '@tanstack/react-query'

const YAHOO_BASE = import.meta.env.DEV
  ? '/api/yahoo'         // Vite proxy — no CORS in dev
  : 'https://query1.finance.yahoo.com'  // Direct in prod (Netlify function can proxy)

async function fetchBatchQuotes(
  tickers: string[]
): Promise<Record<string, { price: number; marketCapB: number }>> {
  if (tickers.length === 0) return {}
  try {
    const symbols = tickers.join(',')
    const url = `${YAHOO_BASE}/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=regularMarketPrice,marketCap`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return {}
    const json = await res.json()
    const results: unknown[] = json?.quoteResponse?.result ?? []
    const out: Record<string, { price: number; marketCapB: number }> = {}
    for (const r of results as Array<Record<string, unknown>>) {
      const ticker = r['symbol'] as string
      const price = r['regularMarketPrice'] as number | undefined
      const marketCap = r['marketCap'] as number | undefined
      if (ticker && price != null) {
        out[ticker] = {
          price,
          marketCapB: marketCap != null ? marketCap / 1e9 : 0,
        }
      }
    }
    return out
  } catch {
    return {}
  }
}

// Hook: fetch live quotes for a list of tickers
export function useMarketQuotes(tickers: string[]) {
  return useQuery({
    queryKey: ['market-quotes', tickers],
    queryFn: () => fetchBatchQuotes(tickers),
    staleTime: 5 * 60 * 1000,  // 5 minutes
    retry: 1,
    enabled: tickers.length > 0,
    refetchOnWindowFocus: false,
  })
}

// Export for TickerSearch component to use directly (not as a hook)
export async function fetchSingleQuote(ticker: string): Promise<{ name: string; price: number; marketCapB: number } | null> {
  try {
    const url = `${YAHOO_BASE}/v7/finance/quote?symbols=${encodeURIComponent(ticker)}&fields=regularMarketPrice,marketCap,longName,shortName`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const json = await res.json()
    const result = json?.quoteResponse?.result?.[0] as Record<string, unknown> | undefined
    if (!result) return null
    return {
      name: (result['longName'] as string | undefined) ?? (result['shortName'] as string | undefined) ?? ticker,
      price: (result['regularMarketPrice'] as number) ?? 0,
      marketCapB: result['marketCap'] != null ? (result['marketCap'] as number) / 1e9 : 0,
    }
  } catch {
    return null
  }
}

// Keep for API compat but now unused
export function useRefreshFromSource() {
  return useQuery({
    queryKey: ['source-refresh'],
    queryFn: async () => null,
    enabled: false,
    retry: 0,
  })
}
