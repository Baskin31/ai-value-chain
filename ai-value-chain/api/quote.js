// Vercel serverless function: proxies Yahoo Finance v7 quote API
// Runs server-side — no CORS issues. Called from production as /api/quote
export default async function handler(req, res) {
  const symbols = req.query.symbols ?? ''
  if (!symbols) {
    return res.status(400).json({ error: 'symbols param required' })
  }

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=regularMarketPrice,marketCap,longName,shortName`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json',
      },
    })
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Yahoo Finance error' })
    }
    const data = await response.json()
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
