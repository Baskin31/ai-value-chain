// Vercel serverless function: AI-powered company analysis via Claude
// API key is passed per-request in x-anthropic-key header (BYOK — user's own key)

const LAYERS = [
  'raw_materials',
  'lithography_fab_equipment',
  'fabrication_packaging',
  'memory',
  'silicon_design',
  'energy_power',
  'data_centers_compute',
  'frontier_labs',
  'application_harness',
]

function buildPrompt(ticker, name, marketCapB) {
  return `You are analyzing ${name} (${ticker}) for an AI value chain investor tool. Current market cap: ~$${marketCapB > 0 ? marketCapB.toFixed(0) + 'B' : 'unknown'}.

The tool covers companies across the full AI stack. Layer IDs and what belongs in each:
- raw_materials: Mining, rare earths, critical minerals (MP Materials, Lynas, Albemarle)
- lithography_fab_equipment: Semiconductor equipment (ASML, AMAT, LAM, KLA, Lasertec)
- fabrication_packaging: Fabs and OSAT (TSMC, Samsung foundry, ASE, Amkor)
- memory: DRAM, NAND, HBM (Micron, SK Hynix, Samsung memory)
- silicon_design: GPU/CPU/ASIC designers (NVIDIA, AMD, Broadcom, Intel)
- energy_power: Power gen and thermal mgmt for data centers (NextEra, Constellation, Vertiv)
- data_centers_compute: Hyperscalers, GPU clouds, colocation REITs (AWS, Azure, CoreWeave, Equinix)
- frontier_labs: Frontier AI model companies (OpenAI, Anthropic, xAI, Mistral)
- application_harness: Enterprise AI software, vertical AI apps (Salesforce, ServiceNow, Palantir)

Return ONLY a valid JSON object — no markdown fences, no explanation, just the JSON:

{
  "name": "Full company name",
  "description": "2-3 sentence description of this company's position and relevance to the AI value chain",
  "suggested_layer": "<one of the layer IDs above>",
  "is_dark_horse": false,
  "investability_notes": "How a retail investor accesses this: US ticker, ADR, HK Stock Connect, proxy, or not listed",
  "moat_durability": 7,
  "moat_durability_rationale": "1-2 sentences on durability of competitive advantage",
  "revenue_defensibility": 6,
  "revenue_defensibility_rationale": "1-2 sentences on revenue stability and switching costs",
  "balance_sheet_strength": 8,
  "balance_sheet_rationale": "1-2 sentences on financial position",
  "downside_scenario": "1-2 sentences describing the main bear case",
  "market_expansion": 7,
  "market_expansion_rationale": "1-2 sentences on TAM growth and expansion potential",
  "competitive_position_ceiling": 8,
  "competitive_position_rationale": "1-2 sentences on how dominant this could become",
  "strategic_optionality": 6,
  "strategic_optionality_rationale": "1-2 sentences on unpriced optionality and upside vectors",
  "upside_probability": 0.40,
  "upside_multiple": 4.0,
  "valuation_sentiment": "fair",
  "strategic_dynamics": [
    {"type": "risk", "note": "Primary risk to the investment thesis"},
    {"type": "opportunity", "note": "Primary opportunity or tailwind"}
  ]
}

Scoring rubric (all scores 1–10):
- moat_durability: 9-10 = near-monopoly, very high switching costs; 6-7 = differentiated, defensible; 3-5 = competitive market; 1-2 = commodity, easily replaced
- revenue_defensibility: 9-10 = fully contracted, recurring; 6-7 = mix of recurring and variable; 3-5 = cyclical; 1-2 = highly lumpy or project-based
- balance_sheet_strength: 9-10 = net cash fortress; 6-7 = investment grade, moderate leverage; 3-5 = manageable debt; 1-2 = distressed or burning cash with no path to profitability
- market_expansion: 9-10 = massive underpenetrated TAM with structural growth; 6-7 = healthy growth; 3-5 = mature; 1-2 = declining
- competitive_position_ceiling: 9-10 = could become the global category standard; 6-7 = top-3 in an important niche; 3-5 = solid but capped; 1-2 = subscale
- strategic_optionality: 9-10 = multiple large unpriced options; 6-7 = some meaningful adjacencies; 3-5 = limited; 1-2 = pure-play, no optionality

upside_probability: probability 0.0–1.0 that the upside scenario materializes within 5 years
upside_multiple: if upside scenario happens, peak market cap as a multiple of today's cap (1.0–20.0)
valuation_sentiment: one of "cheap" | "fair" | "stretched" | "priced_for_perfection"

Be honest and calibrated. Most companies score 5-7 on most dimensions. Reserve 9-10 for genuinely exceptional cases like TSMC's fab lead or NVIDIA's CUDA moat.`
}

export default async function handler(req, res) {
  const apiKey = req.headers['x-anthropic-key'] ?? ''
  if (!apiKey) {
    return res.status(401).json({ error: 'No API key provided. Add your Anthropic API key in the app settings.' })
  }

  const { ticker, name, marketCapB } = req.query
  if (!ticker || !name) {
    return res.status(400).json({ error: 'ticker and name are required' })
  }

  const capB = parseFloat(marketCapB ?? '0')

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: buildPrompt(ticker, name, capB) }],
      }),
    })

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json().catch(() => ({}))
      const msg = err?.error?.message ?? `Anthropic API error ${anthropicRes.status}`
      return res.status(anthropicRes.status).json({ error: msg })
    }

    const data = await anthropicRes.json()
    let text = (data.content?.[0]?.text ?? '').trim()

    // Strip markdown fences if Claude wraps response
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    }

    const analysis = JSON.parse(text)

    // Validate suggested_layer
    if (!LAYERS.includes(analysis.suggested_layer)) {
      analysis.suggested_layer = 'application_harness'
    }

    // Clamp numeric fields
    for (const key of ['moat_durability', 'revenue_defensibility', 'balance_sheet_strength',
      'market_expansion', 'competitive_position_ceiling', 'strategic_optionality']) {
      analysis[key] = Math.min(10, Math.max(1, Math.round(analysis[key] ?? 5)))
    }
    analysis.upside_probability = Math.min(0.95, Math.max(0.05, analysis.upside_probability ?? 0.35))
    analysis.upside_multiple = Math.min(20, Math.max(1, analysis.upside_multiple ?? 3))

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json(analysis)
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
