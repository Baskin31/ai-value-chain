# AI Value Chain — Design Spec
**Date:** 2026-07-06
**Status:** Approved

> DISCLAIMER (repeated throughout the app): This tool provides illustrative structured judgment about competitive position and investment entry. It is not a forecast, price target, or financial recommendation. The author is not a financial advisor. All analysis reflects the author's opinions as of the dates shown.

---

## 1. Purpose

A local web application (deployable as a static site) that helps an investor reason about companies across the full AI value chain — "from the mine to the harness." The tool separates business quality from investment entry, distinguishes downside protection from upside potential, and keeps data provenance (sourced fact vs. modelled judgment) explicit throughout.

---

## 2. Runtime & Deployment

- **Development:** `npm run dev` — Vite dev server, hot-module reloads on YAML edits
- **Production:** `npm run build` → static `dist/` deployable to Netlify, Vercel, or GitHub Pages
- No backend, no database, no authentication
- All data ships with the build; live market data is a client-side overlay

---

## 3. Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | React + TypeScript | Type safety across data model and UI |
| Build | Vite + `vite-plugin-yaml` | YAML imports resolved at build time |
| Styling | Tailwind CSS | Utility-first, consistent with monorepo |
| Charts | Recharts (most) + D3 (scatter) | Recharts for speed; D3 for custom quadrant scatter |
| State | Zustand | Lightweight; model weight overrides, filters, picks |
| Data fetching | TanStack Query | Live market data caching + refresh |
| Schema validation | Zod | Runtime + build-time validation of all YAML |
| Testing | Vitest | Unit tests for model/ pure functions |

---

## 4. Project Structure

```
ai-value-chain/
├── data/
│   ├── layers.yaml              # Layer definitions, ordering, accent colors
│   ├── model-config.yaml        # Scoring weights + assumptions (tunable knobs)
│   └── companies/
│       ├── nvidia.yaml
│       ├── asml.yaml
│       └── ...                  # ~60 companies at seed; one file per company
├── src/
│   ├── schema/                  # Zod schemas — single source of truth for data shape
│   │   ├── company.ts
│   │   └── layer.ts
│   ├── data/
│   │   └── loader.ts            # Imports + validates all YAML at build time
│   ├── model/                   # Pure TS functions, no React imports, fully testable
│   │   ├── floor.ts
│   │   ├── ceiling.ts
│   │   ├── valuation.ts
│   │   └── index.ts             # Composed entry_score computation
│   ├── market/
│   │   └── client.ts            # TanStack Query hooks for live price/cap overlay
│   ├── store/
│   │   └── index.ts             # Zustand: filters, model weight overrides, picks
│   ├── components/
│   │   ├── charts/
│   │   │   ├── FloorCeilingScatter.tsx   # D3: quadrant scatter, log-scaled bubbles
│   │   │   ├── UpsideShapeChart.tsx      # Recharts: probability × magnitude point
│   │   │   └── LayerBar.tsx              # Recharts: floor/ceiling mini-bars
│   │   ├── CompanyCard.tsx
│   │   ├── CompanyDetail.tsx             # Slide-in panel
│   │   ├── LayerStrip.tsx
│   │   ├── ModelControls.tsx             # Weight sliders
│   │   ├── DataFreshnessBar.tsx
│   │   ├── Disclaimer.tsx
│   │   └── picks/
│   │       ├── PicksView.tsx
│   │       ├── PickCard.tsx
│   │       └── PickEditor.tsx
│   └── App.tsx
├── scripts/
│   └── validate.ts              # `npm run validate` — Zod-checks all YAML, exits 1 on failure
├── vite.config.ts
├── package.json
└── README.md
```

---

## 5. Data Model

### 5.1 Company YAML Schema

One file per company in `data/companies/`. Full annotated example:

```yaml
id: asml                          # kebab-case, unique, used for relationships + picks
name: ASML Holding
ticker: ASML
exchange: NASDAQ                  # primary listing accessible to US retail investors
layer: lithography_fab_equipment  # must match an id in layers.yaml
is_dark_horse: false
description: >
  Sole manufacturer of EUV lithography systems required for sub-7nm chips.
  ~90% gross margin. Backlog visibility 2+ years out.

investability:
  type: direct                    # direct | adr | proxy | hk_stock_connect | etf_bucket | uninvestable
  notes: "Listed on NASDAQ as ASML (ADR). Also trades on Euronext Amsterdam."
  proxy_for: null                 # required non-null when type=proxy

# ANALYST INPUTS — structured judgment, not sourced facts.
# Rationale required for every scored field.
# Refreshed only by manual YAML edit (or a new Claude session).
model:
  model_updated: "2026-07-06"     # date analyst inputs were last reviewed

  # Floor inputs (0–10 scale)
  moat_durability: 9
  moat_durability_rationale: "EUV is a 20-year R&D moat; no credible alternative supplier"
  revenue_defensibility: 8
  revenue_defensibility_rationale: "Multi-year backlog, service revenue ~25% of sales"
  balance_sheet_strength: 7
  balance_sheet_rationale: "Net cash positive, but capex-heavy to sustain R&D lead"
  downside_scenario: >
    Export controls expand to cover DUV systems, collapsing China revenue (~15% of sales).
    Or: geopolitical disruption of Veldhoven facility.

  # Ceiling inputs (0–10 scale)
  market_expansion: 8
  market_expansion_rationale: "Gate-all-around transition and High-NA EUV drive 2nd upcycle"
  competitive_position_ceiling: 9
  competitive_position_rationale: "No competitor within 5–10 years of EUV parity"
  strategic_optionality: 7
  strategic_optionality_rationale: "Benefits from any AI capex flowing to advanced nodes"

  # Upside shape — two coordinates, NOT collapsed to a single EV number
  upside_probability: 0.50        # P(bull case materializes in 5yr horizon), 0–1
  upside_multiple: 3.5            # bull case market cap / today's market cap (raw, before cap)

  # What's already priced in
  valuation_sentiment: stretched  # cheap | fair | stretched | priced_for_perfection

# SOURCED FACTS — traceable to public filings or market data.
# market_cap_usd_b is overridden at runtime by live data fetch.
# All other fundamentals are manually entered with citations.
fundamentals:
  market_cap_usd_b: 285
  market_cap_date: "2026-06-01"   # warn in UI if >21 days old
  revenue_ttm_usd_b: 27.6
  revenue_growth_yoy: 0.12
  pe_ratio: 32
  sources:
    - description: "ASML Q1 2026 earnings release"
      url: "https://www.asml.com/en/investors/quarterly-results"
      accessed: "2026-06-01"
      is_sourced_fact: true

# STRATEGIC DYNAMICS — free text, tagged as risk or opportunity
strategic_dynamics:
  - type: risk
    note: "Export controls are an existential variable: Dutch/US governments control ASML's TAM"
  - type: risk
    note: "TSMC concentration: ~50% of revenue; if TSMC capex contracts, ASML follows"
  - type: opportunity
    note: "Intel foundry ambitions are a large incremental customer if they execute"

# RELATIONSHIPS — validated against other company ids at build time
relationships:
  - company_id: tsmc
    type: customer
    note: "~50% of EUV shipments"
  - company_id: samsung
    type: customer
    note: "Second-largest EUV customer"
```

### 5.2 Zod Validation Rules (`npm run validate`)

**Hard errors (exits 1):**
- Any required field missing
- `upside_probability` outside [0, 1]
- `upside_multiple` < 1
- `valuation_sentiment` not one of four enum values
- `investability.type` not one of four enum values
- `investability.proxy_for` is null when `type === "proxy"`
- `layer` does not match any id in `layers.yaml`
- Any `relationships[].company_id` does not match an existing company file

**Warnings (non-fatal):**
- `fundamentals.market_cap_date` is more than 21 days before today
- `model.model_updated` is more than 90 days before today
- `strategic_dynamics` is empty

### 5.3 `model-config.yaml`

```yaml
floor_weights:
  moat_durability: 0.30
  revenue_defensibility: 0.40
  balance_sheet_strength: 0.30

ceiling_weights:
  market_expansion: 0.40
  competitive_position_ceiling: 0.30
  strategic_optionality: 0.30

valuation_sentiment_multipliers:
  cheap: 1.20
  fair: 1.00
  stretched: 0.85
  priced_for_perfection: 0.70

# Hard cap on upside multiples — prevents flattering large-cap companies.
# Default: largest market cap ever reached (~$3.8T Apple peak) × 2 = $8T.
max_plausible_market_cap_usd_b: 8000
```

### 5.4 `layers.yaml`

```yaml
layers:
  - id: raw_materials
    name: Raw Materials & Refining
    order: 1
    accent_color: "#a78bfa"   # violet
  - id: lithography_fab_equipment
    name: Lithography & Fab Equipment
    order: 2
    accent_color: "#60a5fa"   # blue
  - id: fabrication_packaging
    name: Fabrication & Advanced Packaging
    order: 3
    accent_color: "#34d399"   # emerald
  - id: memory
    name: Memory
    order: 4
    accent_color: "#fbbf24"   # amber
  - id: silicon_design
    name: Silicon Design
    order: 5
    accent_color: "#f87171"   # red
  - id: energy_power
    name: Energy & Power
    order: 6
    accent_color: "#fb923c"   # orange
  - id: data_centers_compute
    name: Data Centers & Compute
    order: 7
    accent_color: "#38bdf8"   # sky
  - id: frontier_labs
    name: Frontier Model Labs
    order: 8
    accent_color: "#e879f9"   # fuchsia
  - id: application_harness
    name: Application & Harness Layer
    order: 9
    accent_color: "#4ade80"   # green
```

---

## 6. Analytical Model

All logic lives in `src/model/` as pure TypeScript. No React imports. Fully unit-tested via Vitest.

### 6.1 Floor Score (0–10)

```
floor = moat_durability × floor_weights.moat_durability
      + revenue_defensibility × floor_weights.revenue_defensibility
      + balance_sheet_strength × floor_weights.balance_sheet_strength
```

Moat durability is deliberately one of three inputs — not the dominant one. A company with a strong moat but no cash and cyclical revenue scores lower than a company with a moderate moat and iron-clad contracts.

### 6.2 Ceiling Score (0–10, before valuation adjustment)

```
ceiling_raw = market_expansion × ceiling_weights.market_expansion
            + competitive_position_ceiling × ceiling_weights.competitive_position_ceiling
            + strategic_optionality × ceiling_weights.strategic_optionality
```

`strategic_optionality` captures the "rising tide" question: does this company benefit from *more total AI capex* regardless of who wins at adjacent layers?

### 6.3 Valuation Adjustment

Applied to ceiling only. A stretched valuation compresses upside from today's entry price but does not worsen the downside floor.

```
ceiling_adjusted = ceiling_raw × valuation_sentiment_multipliers[valuation_sentiment]
```

### 6.4 Upside: Honest About Size

Raw multiples are physically capped by what market caps can realistically reach:

```
effective_multiple = min(
  upside_multiple,
  max_plausible_market_cap_usd_b / current_market_cap_usd_b
)
```

With `max_plausible_market_cap_usd_b = 8000`, a company at $3.2T has a hard cap of ~2.5×. A $10B dark horse can show 10×+. The UI also displays absolute dollar upside per $1 invested alongside the multiple.

### 6.5 Upside Shape

Two-coordinate system — never collapsed to a single expected value as the primary signal:

```
X: upside_probability     (0–1) — "how likely is the bull case?"
Y: effective_multiple           — "how large if it happens?"
```

Four archetypes emerge on the scatter:
| | Low magnitude | High magnitude |
|---|---|---|
| **High probability** | Compounder | Dream position |
| **Low probability** | Skip | Lottery ticket |

Expected value `EV = upside_probability × (effective_multiple - 1)` is computed as a secondary number, not the primary sort key.

### 6.6 Risk-Adjusted Entry Score (primary sort key)

```
entry_score = floor_score × 0.40
            + ceiling_adjusted × 0.35
            + EV × 0.25
```

All weights are in `model-config.yaml` and exposed as live sliders in the UI. Changes are ephemeral (Zustand) — refreshing resets to YAML defaults. The YAML is the authoritative model; sliders are for "what if" exploration.

### 6.7 Model Weaknesses

1. `valuation_sentiment` is a coarse 4-level enum. A future improvement: numeric premium-to-peers input.
2. Companies are scored in isolation — no portfolio-level correlation modeling.
3. `upside_probability` is the single most influential input and the hardest to calibrate. It is pure judgment.

---

## 7. Live Market Data

- **Source:** Yahoo Finance unofficial JSON endpoint (no API key, rate-limited, suitable for personal use). Optional: set `VITE_MARKET_API_KEY` for Twelve Data or Polygon.
- **What is updated:** `market_cap_usd_b` and current price only. All other fundamentals and all analyst judgments remain as YAML seed values.
- **Fallback:** If fetch fails, app shows seed data with a "using static data — last fetched [date]" badge. No crash, no broken UI.
- **On-demand YAML refresh:** Set `VITE_DATA_SOURCE_URL` to a GitHub raw content base URL. The "Refresh Analysis Data" button fetches YAML files from that URL, re-validates via Zod, and re-scores. Falls back to bundled data silently if the env var is not set or fetch fails. In `npm run dev`, Vite HMR handles YAML changes automatically — no button needed.

---

## 8. UX Design

### 8.1 Aesthetic

Dark background (slate-950), monospace type for all numbers, each layer has a persistent accent color used across every view. Dense and structured — closer to a trading terminal than a consumer app.

### 8.2 Layout

Three persistent regions:
1. **Header** — title, disclaimer (persistent small text), data freshness bar, refresh buttons
2. **Left sidebar** — layer filter checkboxes, model weight sliders (collapsible)
3. **Main canvas** — view switcher (Stack / Scatter / Ranking / My Picks) + content
4. **Detail panel** — slides in from the right on company selection; main canvas narrows

### 8.3 Data Freshness Bar (header)

A thin strip showing:
- Market data: last fetched timestamp + "Refresh" button
- Model data: oldest `model_updated` date across loaded companies + "Refresh from source" button
- Stale count: "N companies need model review" (model_updated > 90 days) / "N companies have stale market cap" (market_cap_date > 21 days)

### 8.4 View: Stack (default)

Nine horizontal layer bands, top (raw materials) to bottom (harness). Within each band, company cards sorted by `entry_score` descending. Dark horses marked with ◆.

Each card shows:
- Name, ticker, exchange tag
- Floor bar (blue) + ceiling-adjusted bar (amber) — immediate visual of position shape
- Entry score (number)
- Staleness indicator: green (fresh) / yellow (model or market data > threshold) / red (both stale)
- "Add to Picks" button

### 8.5 View: Scatter

X: Floor Score. Y: Ceiling Score (valuation-adjusted). Dot size: market cap (log-scaled). Dot color: layer color. Quadrant lines at midpoints with labels: "Structural position" / "High risk, high reward" / "Safe but capped" / "Avoid."

Implemented in D3. Hover: tooltip with name, entry score, upside shape. Click: opens detail panel.

### 8.6 View: Ranking

Sortable table. Columns: Company · Layer · Floor · Ceiling (adj.) · EV · Entry Score · Upside Shape (sparkline) · Investability · Data age. Default sort: Entry Score descending.

### 8.7 View: My Picks

Personal watchlist. Persisted in `localStorage`. Export to `picks.json` / Import from file.

Each pick entry:
```typescript
{
  company_id: string
  status: "Watching" | "Positioned" | "Exited"
  note: string                        // free text: why watching / what I'm waiting for
  target_entry_price?: number         // optional, USD
  target_allocation_notes?: string    // optional free text
  date_added: string                  // ISO date
  date_updated: string                // ISO date
}
```

Layout: cards grouped by status (Watching → Positioned → Exited). Each card shows company name, layer badge, current entry score, floor/ceiling mini-bars, personal note, target price, dates. All fields editable inline.

Summary bar at top: count per status, layers represented, stale data warnings for picks.

"Add to Picks" button appears on every company card, detail panel, and ranking row — adds at Watching status, opens inline note editor.

### 8.8 Company Detail Panel

Slide-in from right. Sections:
1. **Header** — name, ticker, investability badge, market data timestamp, model_updated date
2. **Score breakdown** — weighted input bars for floor (3 inputs) and ceiling (3 inputs)
3. **Upside Shape chart** — single point on probability × magnitude plane with quadrant labels
4. **Valuation note** — sentiment label + "ceiling compressed from X → Y due to [sentiment]"
5. **Strategic dynamics** — bulleted list, each tagged risk (red) or opportunity (green)
6. **Relationships** — linked chips; clicking navigates to that company's detail
7. **Sources** — numbered citations with description, URL, access date, sourced-fact badge
8. **Disclaimer** — repeated inline

### 8.9 Model Controls (left sidebar)

Sliders for: 3 floor weights, 3 ceiling weights, 4 valuation multipliers, max_plausible_market_cap. All changes ephemeral (Zustand). "Reset to defaults" button.

### 8.10 Disclaimer

Shown: (a) persistent small text in header, (b) inline in every detail panel, (c) dismissible modal on first load (not shown again until app version changes).

Text: *"This tool provides illustrative structured judgment about competitive position and investment entry. It is not a forecast, price target, or financial recommendation. The author is not a financial advisor. All analysis reflects the author's opinions as of the dates shown."*

---

## 9. Adding a Company

1. Create `data/companies/<id>.yaml` following the schema in Section 5.1
2. Run `npm run validate` — fix any errors before proceeding
3. In dev mode, Vite HMR reloads automatically. For production, rebuild and redeploy.
4. If `VITE_DATA_SOURCE_URL` is set, push the new file to your repo and click "Refresh Analysis Data" in the app — no rebuild needed.

---

## 10. Critical Assumptions

The three assumptions that, if wrong, would most change the model's conclusions:

1. **`upside_probability` calibration.** This is analyst judgment with no quantitative grounding. A systematic 0.1 shift up or down across all companies changes the ranking significantly. The model is most sensitive to this input because it multiplies the magnitude in the EV term.

2. **`max_plausible_market_cap_usd_b = 8000`.** This is the mechanism that prevents the model from flattering giants. If you believe a $10T+ company is plausible (it has never happened), raising this number will materially increase the ceiling scores of NVIDIA, Microsoft, and Apple. Conversely, lowering it to $5T makes large-cap upside even more compressed.

3. **`valuation_sentiment` coarseness.** Mapping a company to one of four buckets compresses real valuation nuance. Two companies both labeled `priced_for_perfection` but trading at 40× vs. 80× forward earnings receive identical ceiling adjustments. Any conclusion that hinges on a single-notch difference in sentiment should be treated skeptically.

---

## 11. Seed Companies (~60 at launch)

Seeded across all 9 layers with both obvious representatives and dark horses. Dark horses marked `is_dark_horse: true`.

| Layer | Obvious | Dark Horses |
|---|---|---|
| Raw Materials | MP Materials, Albemarle, Lynas | Perpetua Resources, Energy Fuels, Vital Metals, China Rare Earth (HK: 0769, via HK Stock Connect), China Northern Rare Earth (SH: 600111, via HK Stock Connect), REMX (VanEck Rare Earth/Strategic Metals ETF — bucket exposure to China-dominant supply chain) |
| Lithography & Fab Equipment | ASML, Applied Materials, Lam Research | Onto Innovation, Axcelis Technologies, Lasertec |
| Fabrication & Packaging | TSMC, Samsung, Intel Foundry | ASE Technology, Amkor, JCET Group |
| Memory | Micron, SK Hynix, Samsung | CXMT (proxy only), Nanya Technology |
| Silicon Design | NVIDIA, AMD, Broadcom | Cerebras (uninvestable), Groq (uninvestable), Tenstorrent (uninvestable), d-Matrix |
| Energy & Power | NextEra Energy, Constellation Energy | Vertiv, nVent Electric, Bloom Energy |
| Data Centers & Compute | Microsoft Azure, AWS (Amazon), Google Cloud | CoreWeave (recent IPO), Equinix, Digital Realty |
| Frontier Labs | Microsoft (OpenAI proxy), Google (Gemini), Amazon (Anthropic proxy) | xAI (uninvestable), Mistral (uninvestable) |
| Application & Harness | Salesforce, ServiceNow, Palantir | Harvey (uninvestable), Glean (uninvestable), Writer (uninvestable) |
