# Eureka News

A personal, on-demand local news aggregator for Eureka, MO 63025 / unincorporated
St. Louis County. Not a daily digest — run it manually when you want a summary.
An empty or near-empty result for a category is a valid, correct outcome.

## Setup

```bash
uv sync
uv run playwright install chromium   # required once, for the Chamber of Commerce adapter
```

Optional: set `ANTHROPIC_API_KEY` in your environment to enable the LLM
relevance-judgment pass and generated summaries. Without it, the tool falls
back to keyword-only filtering and shows title + source link only, with an
explicit note in the output.

## Usage

```bash
uv run eureka-news                              # last 7 days (default)
uv run eureka-news --since 14d                  # last 14 days
uv run eureka-news --from 2026-08-01 --to 2026-08-17
```

Output is Markdown printed to stdout. Redirect to a file yourself if you want
to keep a copy: `uv run eureka-news > summary.md`.

## Known limitations (v1)

See `docs/superpowers/specs/2026-08-17-eureka-news-design.md` in this repo for
the full source research and architecture. Highlights:

- Categories 4 (roads/utilities), 5 (zoning), and 9 (golf carts) have no
  dedicated source — they only surface via keyword-filtered items from other
  adapters, so they may come back empty most runs. This is structural, not a bug.
- County Council coverage surfaces upcoming meeting agendas only (title, date,
  link) — it does not parse agenda/minutes PDF text, so it can't yet
  distinguish a routine meeting from a consequential tax/spending vote.
- DESE school accreditation ratings are not pulled automatically (only
  available as a periodic PDF) — check manually if that matters for a given run.
- Several adapters (County Council, Rockwood, Brookdale, Chamber, West News)
  scrape HTML/JSON structures that were captured once during development and
  may drift if the source website changes. Each adapter fails in isolation —
  one breaking never crashes the whole run, but its category may go quiet
  until the selectors are updated.
- The Chamber of Commerce adapter's Playwright selectors were written against
  the confirmed presence of a Wix Events widget but not verified against the
  live rendered DOM — check its output on first real run.
