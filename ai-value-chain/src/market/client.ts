import { useQuery } from '@tanstack/react-query'

// Dev: Vite proxy (/api/yahoo → Yahoo Finance, no CORS)
// Prod: Netlify serverless function (/.netlify/functions/quote, runs server-side)
function quoteUrl(symbols: string): string {
  if (import.meta.env.DEV) {
    return `/api/yahoo/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=regularMarketPrice,marketCap,longName,shortName`
  }
  return `/.netlify/functions/quote?symbols=${encodeURIComponent(symbols)}`
}

async function fetchBatchQuotes(
  tickers: string[]
): Promise<Record<string, { price: number; marketCapB: number }>> {
  if (tickers.length === 0) return {}
  try {
    const url = quoteUrl(tickers.join(','))
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return {}
    const json = await res.json()
    const results: unknown[] = json?.quoteResponse?.result ?? []
    const out: Record<string, { price: number; marketCapB: number }> = {}
    for (const r of results as Array<Record<string, unknown>>) {
      const ticker = r['symbol'] as string
      const price = r['regularMarketPrice'] as number | undefined
      const marketCap = r['marketCap'] as number | undefined
      if (ticker && price != null) {
        out[ticker] = { price, marketCapB: marketCap != null ? marketCap / 1e9 : 0 }
      }
    }
    return out
  } catch {
    return {}
  }
}

export function useMarketQuotes(tickers: string[]) {
  return useQuery({
    queryKey: ['market-quotes', tickers],
    queryFn: () => fetchBatchQuotes(tickers),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: tickers.length > 0,
    refetchOnWindowFocus: false,
  })
}

export async function fetchSingleQuote(ticker: string): Promise<{ name: string; price: number; marketCapB: number } | null> {
  try {
    const url = quoteUrl(ticker)
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
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

export function useRefreshFromSource() {
  return useQuery({ queryKey: ['source-refresh'], queryFn: async () => null, enabled: false, retry: 0 })
}
