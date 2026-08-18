# Eureka, MO Personal Local News Aggregator — Design Spec

Date: 2026-08-17
Status: Approved for planning

## Purpose

An on-demand CLI tool that pulls local news/civic info relevant to Eureka, MO
63025 / unincorporated St. Louis County for a user-specified date window
(default: last 7 days), filters it against a specific personal relevance
profile, and prints a categorized Markdown summary to stdout. It is a manual
tool, not a scheduled digest, and an empty or near-empty result is a valid,
correct output — never pad output to seem more substantial.

## Non-goals for v1

- No persistence/state between runs (stateless — see Decisions below)
- No social media integration (Facebook/X/Nextdoor) — explicitly deferred to
  Phase 2 per the original brief, not attempted in this spec
- No file output — stdout only
- No daily/scheduled automation

## Source research findings

Before designing adapters, every candidate source from the original brief was
checked for a real feed/API vs. requiring scraping vs. being a dead end. This
section is the ground truth the architecture is built against — it
supersedes the source assumptions in the original brief where they conflict.

### Confirmed: clean feed/API, no scraping needed

| Source | Category | Endpoint | Notes |
|---|---|---|---|
| City of Eureka news flash | 1 | `eureka.mo.us/RSSFeed.aspx?ModID=1&CID=All-newsflash.xml` | RSS 2.0, CivicPlus platform |
| City of Eureka alert center | 1, 2, 4 | `eureka.mo.us/RSSFeed.aspx?ModID=63&CID=All-0` | RSS 2.0 |
| City of Eureka blog | 1 | `eureka.mo.us/RSSFeed.aspx?ModID=51&CID=All-blog.xml` | RSS 2.0 |
| City of Eureka Board of Aldermen agendas/minutes | 1 | `eureka.mo.us/RSSFeed.aspx?ModID=65&CID=Board-of-Aldermen-2` | RSS items link to PDFs at `/AgendaCenter/ViewFile/...` — this is the primary source for pre-meeting agenda surfacing |
| USGS Water Services (Meramec near Eureka) | 7 | `waterservices.usgs.gov/nwis/iv/?sites=07019000&format=json&parameterCd=00060,00065` | Gauge 07019000, no auth, JSON. 00060=discharge(cfs), 00065=gauge height(ft) |
| NWS NWPS river forecast | 7 | `api.water.noaa.gov/nwps/v1/gauges/erkm7` | Flood stage thresholds (action 17ft/minor 19ft/moderate 26ft/major 31ft) + current + forecast, no auth, JSON |
| FOX2 (KTVI) news | 1–5 | `fox2now.com/news/feed/` | RSS 2.0, metro-wide firehose — needs keyword filtering |
| KSDK news topics | 1–2 | `ksdk.com/feeds/syndication/rss/news/crime` (and likely sibling topic feeds — verify at implementation time) | RSS 2.0, metro-wide firehose — needs keyword filtering |

### Confirmed: no feed, but scrapeable static HTML

| Source | Category | URL | Notes |
|---|---|---|---|
| St. Louis County Council District 3 | 1 | `stlouisco.civicweb.net/Portal/` | CivicWeb (Granicus) platform, no RSS/iCal/JSON export. Static/server-rendered, not JS-heavy. Both council news and meeting agendas require scraping. |
| Rockwood School District news | 3 | `rsdmo.org/news` | CMS-driven (Finalsite-type), static, no RSS. Eureka HS subsite news location not yet confirmed — needs discovery at implementation time. |
| Brookdale Farms events | 6, 7 | `brookdalefarms.com/events`, `brookdalefarms.com/float-trips` | No RSS. Also doubles as "Eureka Floats," the sole float outfitter on this stretch of the Meramec — one scraper source covers both category 6 (events) and the outfitter-announcement part of category 7. |
| Eureka Chamber of Commerce | 8 | `eurekachamber.org` (also `.us`) | Active org, no RSS. |
| West News Magazine (news sitemap) | 1–9 | `westnewsmagazine.com/news.xml` | Direct scraping of `/news/eureka` is a **hard dead end** — blocked at the edge/WAF level on the very first request, unrelated to request rate. However, `robots.txt` allows the generic `*` user-agent to access `news.xml`, a structured news sitemap (title/date/keywords/location-tagged path per article). **Ethical note:** this site's `robots.txt` explicitly names and disallows ~31 known AI/LLM crawlers (ClaudeBot, GPTBot, anthropic-ai, PerplexityBot, etc.) even though the wildcard rule leaves the sitemap technically open. Decision: poll `news.xml` at low volume with a custom, honestly-identifying User-Agent (states the tool name/purpose, does not spoof a browser or hide that it's automated) — a middle ground between full avoidance and exploiting the wildcard loophole. See Decisions below. |

### Documented dead ends for v1 (not built against)

| Source | Reason |
|---|---|
| West News Magazine `/news/eureka` direct page | Edge/WAF-blocked (HTTP 429) on first request, not rate-related |
| STLtoday (Post-Dispatch) | RSS exists but is now gated behind a paid TollBit bot-license token |
| Ground News Eureka topic page | JS-rendered SPA (Next.js), no RSS, no visible public API |
| STLPR | Only podcast-show RSS exists, no article-level feed |
| MoDOT traveler info | No public API/data feed — only a JS map and mobile app. Missouri has no 511-equivalent public API, unlike neighboring states. |
| Missouri DESE accreditation data | Only available as a static, periodically-updated PDF table (`dese.mo.gov/media/pdf/accreditation-classification-school-districts`) — not a live feed. Richer MCDS portal data sits behind a login wall. |

### Coverage gaps this creates (flagged, not solved here)

- **Category 4 (roads/utilities):** No dedicated closures/construction API (MoDOT dead end). Coverage relies on FOX2/KSDK keyword filtering and the City of Eureka alert feed. No utility-outage/boil-advisory source was identified at all in the original brief or this research — a genuine gap, out of scope for v1.
- **Category 5 (development/zoning):** No dedicated source. Will only surface via keyword-filtered County Council/City agenda items and news firehose items.
- **Category 9 (golf carts):** No dedicated source. Same fallback as above.
- **Category 3 school ratings:** DESE data is a slow-changing PDF, not a live pull — treat as a low-frequency/manual check rather than expecting it in every run's automated pull (implementation detail to resolve in the plan: whether v1 includes an automated PDF-parse adapter at all, or documents this as a manual supplement).

These gaps are structural, not filter bugs — an honest run may show these categories empty most weeks, which is consistent with the brief's "empty is a valid result" principle.

## Decisions

- **Language/tooling:** Python, managed with `uv` (pyproject.toml, no separate venv/pip steps).
- **State:** Fully stateless. Each run independently filters whatever falls in the given date range. Overlapping-window re-runs may show duplicate stories across runs — accepted tradeoff for simplicity.
- **LLM relevance pass:** Optional and pluggable. If `ANTHROPIC_API_KEY` is set, the tool uses Claude to make the nuanced per-item inclusion judgment (and to write 1-3 sentence summaries). If not set, the tool falls back to keyword/entity-only filtering and title+link-only output, and the Markdown output notes explicitly that LLM refinement was not applied for that run.
- **Output:** Markdown printed to stdout only. No automatic file writes. User can redirect (`> summary.md`) themselves.
- **West News Magazine access:** Use the `news.xml` sitemap (robots.txt-permitted for generic user-agents), polled at low volume, with a custom User-Agent string that honestly identifies the tool and its purpose (e.g. `EurekaNewsAggregator/1.0 (personal local-news tool; contact: <user email if desired>)`) rather than spoofing a browser. Do not attempt to access the WAF-blocked `/news/eureka` page directly.
- **Per-source failure isolation:** Every adapter runs in its own try/except at the orchestration level; a failing adapter logs a warning and the run continues with the remaining sources. The tool never crashes wholesale because one fragile scraper broke.

## Architecture

### Components

1. **Source adapters** (`adapters/`) — one module per source, each implementing:
   ```
   fetch(since: date, until: date) -> list[NormalizedItem]
   ```
   `NormalizedItem = {source, url, title, text, published_date, category_hint}`

   Three adapter shapes, sharing the same interface:
   - `RssAdapter` — generic, config-driven (feed URL in), used for City of Eureka's 4 feeds, FOX2, KSDK
   - `ApiAdapter` — source-specific client code, used for USGS Water Services and NWS NWPS
   - `ScraperAdapter` — source-specific BeautifulSoup parsing, used for County Council D3, Rockwood School District, Brookdale Farms, Eureka Chamber of Commerce, and the West News Magazine sitemap

2. **Time window filter** — applied first, before relevance filtering, to cut volume early. Filters `NormalizedItem.published_date` against the requested `[since, until]` range.

3. **Relevance filter** (`relevance/`) — driven by `config/relevance.yaml`, which encodes the 9 categories from the brief as structured rules (keyword hints + the actual written natural-language inclusion/exclusion criteria). Two-pass:
   - Pass 1 (always runs): cheap keyword/entity pre-filter per category — cuts obvious noise, especially from the FOX2/KSDK firehoses.
   - Pass 2 (only if `ANTHROPIC_API_KEY` set): sends items surviving Pass 1, plus the relevant category's written rule text, to Claude for an include/exclude judgment with brief reasoning. Without a key, items survive on Pass 1 alone.

4. **Dedup** — fuzzy title+date matching (`rapidfuzz`) within a category to collapse the same story covered by multiple outlets. Collapsed items cite all contributing source URLs.

5. **Summary generation** — groups surviving items by the 9 fixed categories, in a fixed display order. Every category is always printed, even when empty (`_No relevant items this period._`), so the user knows it was checked, not skipped. When an LLM key is present, Claude writes 1-3 sentence summaries per item/cluster; otherwise output falls back to title + source link only, with a note that LLM refinement was not applied.

6. **CLI** (`eureka-news` entry point via `uv run`) — accepts `--since 7d` or `--from YYYY-MM-DD --to YYYY-MM-DD` (default: last 7 days). Prints Markdown to stdout.

### Data flow

```
adapters (parallel, isolated failure)
  -> raw NormalizedItem list
  -> time window filter
  -> relevance filter (keyword pass, then optional LLM pass)
  -> dedup
  -> summary generation (grouped by category, empty categories shown)
  -> Markdown to stdout
```

### Config

- `config/relevance.yaml` — the 9-category relevance profile (keyword hints + written rules), user-tunable per the brief's requirement that thresholds will need adjusting.
- `config/sources.yaml` — per-source adapter config (feed URLs, scrape targets, rate-limit/politeness settings).

## Testing approach

- Unit tests per adapter against saved fixture responses (recorded RSS/JSON/HTML samples), not live network calls, so tests are stable and don't hammer real sources.
- Unit tests for the relevance filter's keyword pass against representative in/out examples per category.
- An integration/smoke path that can optionally hit live sources (manual, not part of default test run) to catch real-world drift (feed URL changes, markup changes).

## Open items for the implementation plan

- Confirm the actual Eureka HS/elementary Rockwood subsite news URL structure (not resolved during research).
- Confirm KSDK's sibling topic-feed URLs beyond the crime feed found during research.
- Decide during implementation whether DESE PDF-parsing is worth automating for v1 or left as a documented manual check.
