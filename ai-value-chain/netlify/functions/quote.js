// Netlify serverless function: proxies Yahoo Finance v7 quote API
// Runs server-side — no CORS issues. Called from production builds as /.netlify/functions/quote
exports.handler = async (event) => {
  const symbols = event.queryStringParameters?.symbols ?? ''
  if (!symbols) {
    return { statusCode: 400, body: JSON.stringify({ error: 'symbols param required' }) }
  }

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=regularMarketPrice,marketCap,longName,shortName`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json',
      },
    })
    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: 'Yahoo Finance error' }) }
    }
    const data = await res.json()
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5 min cache
      },
      body: JSON.stringify(data),
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) }
  }
}
