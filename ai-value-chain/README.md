# AI Value Chain Investor Tool

A structured-judgment tool for reasoning about companies across the AI value chain — from raw materials to frontier model labs and the application layer.

> **Disclaimer:** This tool provides illustrative structured judgment about competitive position and investment entry. It is not a forecast, price target, or financial recommendation. The author is not a financial advisor. All analysis reflects the author's opinions as of the dates shown.

## How to run

cd ai-value-chain
npm install
npm run dev        # starts at http://localhost:5173

To validate all data files:
npm run validate

To build for production:
npm run build

## How to add a company

1. Create data/companies/<id>.yaml — see any existing file as a template
2. Set all required fields: id, name, layer, investability, and (unless is_exposure_vehicle: true) a full model block
3. Run npm run validate — fix any errors before committing
4. The company will appear automatically in all views

## How to configure live market data

Set environment variables (copy .env.example to .env.local):

VITE_MARKET_API_KEY=your_key_here   # Twelve Data or Polygon.io key
VITE_DATA_SOURCE_URL=https://...    # Optional: URL to fetch updated YAML files

Without these, the app works fully offline using the market cap values embedded in each company's YAML file.

## Key assumptions

The three assumptions that, if wrong, would most change the model's conclusions:

1. Floor weights (moat 30%, revenue defensibility 40%, balance sheet 30%) — revenue defensibility is the dominant input. If moat durability is more predictive of downside protection than revenue defensibility, the floor rankings shift materially, particularly for capital-light software companies vs. capital-intensive hardware companies.

2. The upside cap at max_plausible_market_cap = $8T — this is the single largest constraint on large-cap scores. If the global economy grows faster than assumed and $10T+ companies become plausible within the investment horizon, ceiling scores for NVIDIA, Microsoft, and Alphabet are significantly underestimated. If it's too generous, the cap is too loose to matter.

3. Probability x (multiple - 1) as expected value — the model assumes the upside scenario either happens fully or not at all (binary). Real outcomes have distributions. A company with 40% probability of 3x is treated identically to one with 40% of 3x even if the second has much higher variance. If you care about variance, the EV component of entry score should be risk-adjusted further.

## Architecture notes

- data/ — YAML source of truth; one file per company, plus layers.yaml and model-config.yaml
- src/schema/ — Zod schemas for all data types
- src/model/ — Pure TypeScript scoring functions (no UI dependencies)
- src/store/ — Zustand store (picks persisted, weight overrides ephemeral)
- src/market/ — TanStack Query hooks for live market data
- src/components/ — React UI components
- scripts/validate.ts — Validates all YAML against schemas and cross-checks references
