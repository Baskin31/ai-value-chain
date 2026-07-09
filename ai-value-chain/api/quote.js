// Vercel serverless function: proxies Yahoo Finance with cookie+crumb auth
// Yahoo Finance requires: (1) fetch cookie from homepage, (2) get crumb, (3) use both in quote request

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function getYahooCrumb() {
  // Step 1: hit the consent/cookie endpoint
  const cookieRes = await fetch('https://fc.yahoo.com', {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
  })
  const rawCookies = cookieRes.headers.getSetCookie?.() ?? []
  const cookieHeader = rawCookies.map((c) => c.split(';')[0]).join('; ')

  // Step 2: get crumb using the cookie
  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, Cookie: cookieHeader },
  })
  if (!crumbRes.ok) throw new Error(`crumb ${crumbRes.status}`)
  const crumb = await crumbRes.text()
  return { crumb, cookieHeader }
}

export default async function handler(req, res) {
  const symbols = req.query.symbols ?? ''
  if (!symbols) {
    return res.status(400).json({ error: 'symbols param required' })
  }

  try {
    const { crumb, cookieHeader } = await getYahooCrumb()

    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&crumb=${encodeURIComponent(crumb)}&fields=regularMarketPrice,marketCap,longName,shortName`
    const quoteRes = await fetch(url, {
      headers: { 'User-Agent': UA, Cookie: cookieHeader, Accept: 'application/json' },
    })

    if (!quoteRes.ok) {
      return res.status(quoteRes.status).json({ error: `Yahoo Finance ${quoteRes.status}` })
    }

    const data = await quoteRes.json()
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
