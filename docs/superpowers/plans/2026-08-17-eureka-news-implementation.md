# Eureka News Aggregator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a stateless Python CLI (`eureka-news`) that pulls local news/civic info for Eureka, MO from 9 confirmed sources, filters it through a config-driven 9-category relevance profile, and prints a categorized Markdown summary to stdout.

**Architecture:** Source adapters (RSS/API/scraper, one module each, isolated failure) produce a common `NormalizedItem` list. A time-window filter, then a two-pass relevance filter (keyword pre-filter always, optional Claude LLM judgment pass), then fuzzy dedup, then Markdown summary generation. CLI wires it all together via argparse.

**Tech Stack:** Python 3.11+, `uv` for dependency/env management, `requests` + `feedparser` (RSS), `beautifulsoup4` (HTML scraping), `playwright` (Chamber of Commerce only), `pyyaml` (config), `rapidfuzz` (dedup), `anthropic` (optional LLM pass), `pytest` (tests).

**Spec:** `docs/superpowers/specs/2026-08-17-eureka-news-design.md`

## Global Constraints

- Python >= 3.11, managed via `uv` (pyproject.toml, no manual venv steps)
- Fully stateless: no persistence between runs
- Output: Markdown to stdout only, never a file
- LLM pass is optional and pluggable: enabled only if `ANTHROPIC_API_KEY` is set in the environment; falls back to keyword-only filtering and title+link-only summaries otherwise, with an explicit note in the output that LLM refinement was not applied
- Every adapter fails in isolation (its own try/except in the registry); one broken source never crashes the run
- West News Magazine requests use a custom, honestly-identifying User-Agent string, never a spoofed browser UA
- The 9 relevance categories are always printed in the same fixed order, and an empty category prints `_No relevant items this period._` rather than being omitted
- Model ID for all Claude API calls: `claude-sonnet-5`

---

## File Structure

```
eureka-news/
  pyproject.toml
  README.md
  config/
    relevance.yaml
    sources.yaml
  src/eureka_news/
    __init__.py
    models.py
    window.py
    cli.py
    adapters/
      __init__.py
      base.py
      registry.py
      rss.py
      rss_config.py
      usgs.py
      nws.py
      county_council.py
      rockwood.py
      brookdale.py
      chamber.py
      west_news.py
    relevance/
      __init__.py
      config.py
      keyword_filter.py
      llm_filter.py
    dedup.py
    summarize.py
  tests/
    fixtures/
      rss/sample_feed.xml
      json/usgs_sample.json
      json/nws_sample.json
      html/county_council_meeting_type_list.html
      html/rockwood_news.html
      html/brookdale_events_calendar.html
      html/brookdale_event_detail.html
      html/chamber_events.html
      sitemap/west_news_sitemap.xml
      yaml/sources_sample.yaml
    test_models.py
    test_window.py
    test_adapters_registry.py
    test_adapters_rss.py
    test_adapters_rss_config.py
    test_adapters_usgs.py
    test_adapters_nws.py
    test_adapters_county_council.py
    test_adapters_rockwood.py
    test_adapters_brookdale.py
    test_adapters_chamber.py
    test_adapters_west_news.py
    test_relevance_config.py
    test_relevance_keyword_filter.py
    test_relevance_llm_filter.py
    test_dedup.py
    test_summarize.py
    test_cli.py
```

---

### Task 1: Project scaffolding & NormalizedItem model

**Files:**
- Create: `eureka-news/pyproject.toml`
- Create: `eureka-news/src/eureka_news/__init__.py`
- Create: `eureka-news/src/eureka_news/models.py`
- Test: `eureka-news/tests/test_models.py`

**Interfaces:**
- Produces: `NormalizedItem(source: str, url: str, title: str, text: str, published_date: date, category_hint: str | None = None)` — frozen dataclass, imported by every adapter and downstream module.

- [ ] **Step 1: Create the project directory and pyproject.toml**

```bash
mkdir -p /c/Users/RnBas/ClaudeProjects/eureka-news/src/eureka_news
mkdir -p /c/Users/RnBas/ClaudeProjects/eureka-news/tests/fixtures/rss
mkdir -p /c/Users/RnBas/ClaudeProjects/eureka-news/tests/fixtures/json
mkdir -p /c/Users/RnBas/ClaudeProjects/eureka-news/tests/fixtures/html
mkdir -p /c/Users/RnBas/ClaudeProjects/eureka-news/tests/fixtures/sitemap
mkdir -p /c/Users/RnBas/ClaudeProjects/eureka-news/tests/fixtures/yaml
mkdir -p /c/Users/RnBas/ClaudeProjects/eureka-news/config
```

Write `eureka-news/pyproject.toml`:

```toml
[project]
name = "eureka-news"
version = "0.1.0"
description = "Personal local news aggregator for Eureka, MO"
requires-python = ">=3.11"
dependencies = [
    "requests>=2.31",
    "feedparser>=6.0",
    "beautifulsoup4>=4.12",
    "pyyaml>=6.0",
    "rapidfuzz>=3.9",
    "anthropic>=0.34",
    "playwright>=1.45",
]

[project.scripts]
eureka-news = "eureka_news.cli:main"

[dependency-groups]
dev = [
    "pytest>=8.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/eureka_news"]
```

- [ ] **Step 2: Write the failing test**

Create `eureka-news/tests/test_models.py`:

```python
from datetime import date
from eureka_news.models import NormalizedItem


def test_normalized_item_holds_fields():
    item = NormalizedItem(
        source="Test Source",
        url="https://example.com/a",
        title="Title",
        text="Body text",
        published_date=date(2026, 8, 1),
        category_hint="government",
    )
    assert item.source == "Test Source"
    assert item.published_date == date(2026, 8, 1)
    assert item.category_hint == "government"


def test_normalized_item_category_hint_defaults_to_none():
    item = NormalizedItem(
        source="Test Source",
        url="https://example.com/a",
        title="Title",
        text="Body text",
        published_date=date(2026, 8, 1),
    )
    assert item.category_hint is None
```

- [ ] **Step 3: Run test to verify it fails**

Run (from `eureka-news/`): `uv run pytest tests/test_models.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'eureka_news'` (package doesn't exist yet).

- [ ] **Step 4: Create `__init__.py` and `models.py`**

Create `eureka-news/src/eureka_news/__init__.py` (empty file).

Create `eureka-news/src/eureka_news/models.py`:

```python
from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class NormalizedItem:
    source: str
    url: str
    title: str
    text: str
    published_date: date
    category_hint: str | None = None
```

- [ ] **Step 5: Sync dependencies and run test to verify it passes**

Run: `cd eureka-news && uv sync`
Run: `uv run pytest tests/test_models.py -v`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add eureka-news/pyproject.toml eureka-news/src/eureka_news/__init__.py eureka-news/src/eureka_news/models.py eureka-news/tests/test_models.py eureka-news/uv.lock
git commit -m "feat: scaffold eureka-news project with NormalizedItem model"
```

---

### Task 2: Time window parsing & filtering

**Files:**
- Create: `eureka-news/src/eureka_news/window.py`
- Test: `eureka-news/tests/test_window.py`

**Interfaces:**
- Consumes: `NormalizedItem` from `eureka_news.models`
- Produces: `parse_window(since: str | None, from_date: str | None, to_date: str | None, today: date) -> tuple[date, date]`; `filter_by_window(items: list[NormalizedItem], since: date, until: date) -> list[NormalizedItem]`. `parse_window` auto-extends `until` forward by `AGENDA_LOOKAHEAD_DAYS` (14) whenever the resulting window already reaches today or later, so upcoming meeting agendas and scheduled events (not just past news) get surfaced — per the spec's requirement that agendas be surfaced *before* the meeting happens.

- [ ] **Step 1: Write the failing tests**

Create `eureka-news/tests/test_window.py`:

```python
from datetime import date
import pytest
from eureka_news.window import parse_window, filter_by_window
from eureka_news.models import NormalizedItem


TODAY = date(2026, 8, 17)


def test_default_window_is_last_7_days_extended_forward():
    since, until = parse_window(None, None, None, today=TODAY)
    assert since == date(2026, 8, 10)
    assert until == date(2026, 8, 31)  # today + 14 day agenda lookahead


def test_since_days_format():
    since, until = parse_window("3d", None, None, today=TODAY)
    assert since == date(2026, 8, 14)
    assert until == date(2026, 8, 31)


def test_explicit_from_to_in_the_past_is_not_extended():
    since, until = parse_window(None, "2026-01-01", "2026-01-31", today=TODAY)
    assert since == date(2026, 1, 1)
    assert until == date(2026, 1, 31)


def test_explicit_from_to_reaching_today_is_extended():
    since, until = parse_window(None, "2026-08-01", "2026-08-17", today=TODAY)
    assert until == date(2026, 8, 31)


def test_invalid_since_format_raises():
    with pytest.raises(ValueError):
        parse_window("nonsense", None, None, today=TODAY)


def test_since_and_from_together_raises():
    with pytest.raises(ValueError):
        parse_window("7d", "2026-08-01", "2026-08-17", today=TODAY)


def test_from_without_to_raises():
    with pytest.raises(ValueError):
        parse_window(None, "2026-08-01", None, today=TODAY)


def test_filter_by_window_keeps_items_in_range():
    in_range = NormalizedItem(source="s", url="u1", title="t1", text="", published_date=date(2026, 8, 12))
    out_of_range = NormalizedItem(source="s", url="u2", title="t2", text="", published_date=date(2026, 1, 1))
    result = filter_by_window([in_range, out_of_range], since=date(2026, 8, 10), until=date(2026, 8, 17))
    assert result == [in_range]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_window.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'eureka_news.window'`

- [ ] **Step 3: Implement window.py**

Create `eureka-news/src/eureka_news/window.py`:

```python
import re
from datetime import date, timedelta

from eureka_news.models import NormalizedItem

AGENDA_LOOKAHEAD_DAYS = 14
_SINCE_PATTERN = re.compile(r"^(\d+)d$")


def parse_window(
    since: str | None,
    from_date: str | None,
    to_date: str | None,
    today: date,
) -> tuple[date, date]:
    if since and (from_date or to_date):
        raise ValueError("Use either --since or --from/--to, not both")

    if since:
        match = _SINCE_PATTERN.match(since)
        if not match:
            raise ValueError(f'Invalid --since value: {since!r} (expected format like "7d")')
        days = int(match.group(1))
        start, end = today - timedelta(days=days), today
    elif from_date or to_date:
        if not (from_date and to_date):
            raise ValueError("Both --from and --to are required together")
        start, end = date.fromisoformat(from_date), date.fromisoformat(to_date)
    else:
        start, end = today - timedelta(days=7), today

    if end >= today:
        end = max(end, today + timedelta(days=AGENDA_LOOKAHEAD_DAYS))

    return start, end


def filter_by_window(items: list[NormalizedItem], since: date, until: date) -> list[NormalizedItem]:
    return [item for item in items if since <= item.published_date <= until]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_window.py -v`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add eureka-news/src/eureka_news/window.py eureka-news/tests/test_window.py
git commit -m "feat: add time window parsing with forward agenda lookahead"
```

---

### Task 3: Adapter base interface & fail-isolated registry

**Files:**
- Create: `eureka-news/src/eureka_news/adapters/__init__.py`
- Create: `eureka-news/src/eureka_news/adapters/base.py`
- Create: `eureka-news/src/eureka_news/adapters/registry.py`
- Test: `eureka-news/tests/test_adapters_registry.py`

**Interfaces:**
- Consumes: `NormalizedItem` from `eureka_news.models`
- Produces: `Adapter` protocol (`name: str`, `fetch(since: date, until: date) -> list[NormalizedItem]`); `fetch_all(adapters: list[Adapter], since: date, until: date) -> list[NormalizedItem]` — calls each adapter's `fetch`, catches and logs any exception per-adapter, continues with the rest.

- [ ] **Step 1: Write the failing test**

Create `eureka-news/tests/test_adapters_registry.py`:

```python
from datetime import date
from eureka_news.adapters.registry import fetch_all
from eureka_news.models import NormalizedItem


class WorkingAdapter:
    name = "Working"

    def fetch(self, since, until):
        return [NormalizedItem(source=self.name, url="u", title="t", text="", published_date=since)]


class BrokenAdapter:
    name = "Broken"

    def fetch(self, since, until):
        raise RuntimeError("simulated network failure")


def test_fetch_all_isolates_failures_and_keeps_working_results():
    since, until = date(2026, 8, 1), date(2026, 8, 17)
    items = fetch_all([WorkingAdapter(), BrokenAdapter()], since, until)
    assert len(items) == 1
    assert items[0].source == "Working"


def test_fetch_all_returns_empty_list_when_all_adapters_fail():
    items = fetch_all([BrokenAdapter()], date(2026, 8, 1), date(2026, 8, 17))
    assert items == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_adapters_registry.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'eureka_news.adapters'`

- [ ] **Step 3: Implement base.py and registry.py**

Create `eureka-news/src/eureka_news/adapters/__init__.py` (empty file).

Create `eureka-news/src/eureka_news/adapters/base.py`:

```python
from datetime import date
from typing import Protocol

from eureka_news.models import NormalizedItem


class Adapter(Protocol):
    name: str

    def fetch(self, since: date, until: date) -> list[NormalizedItem]: ...
```

Create `eureka-news/src/eureka_news/adapters/registry.py`:

```python
import logging
from datetime import date

from eureka_news.adapters.base import Adapter
from eureka_news.models import NormalizedItem

logger = logging.getLogger(__name__)


def fetch_all(adapters: list[Adapter], since: date, until: date) -> list[NormalizedItem]:
    items: list[NormalizedItem] = []
    for adapter in adapters:
        try:
            items.extend(adapter.fetch(since, until))
        except Exception:
            logger.warning("Adapter %s failed", getattr(adapter, "name", repr(adapter)), exc_info=True)
    return items
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_adapters_registry.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add eureka-news/src/eureka_news/adapters/__init__.py eureka-news/src/eureka_news/adapters/base.py eureka-news/src/eureka_news/adapters/registry.py eureka-news/tests/test_adapters_registry.py
git commit -m "feat: add adapter interface and fail-isolated registry"
```

---

### Task 4: Generic RSS adapter + sources.yaml config loader

**Files:**
- Create: `eureka-news/src/eureka_news/adapters/rss.py`
- Create: `eureka-news/src/eureka_news/adapters/rss_config.py`
- Create: `eureka-news/config/sources.yaml`
- Create: `eureka-news/tests/fixtures/rss/sample_feed.xml`
- Create: `eureka-news/tests/fixtures/yaml/sources_sample.yaml`
- Test: `eureka-news/tests/test_adapters_rss.py`
- Test: `eureka-news/tests/test_adapters_rss_config.py`

**Interfaces:**
- Consumes: `NormalizedItem` from `eureka_news.models`
- Produces: `RssAdapter(name: str, feed_url: str, category_hint: str | None = None, user_agent: str = "EurekaNewsAggregator/1.0")` with `.fetch(since, until) -> list[NormalizedItem]`; `load_rss_adapters(config_path: Path) -> list[RssAdapter]`

- [ ] **Step 1: Write the failing tests**

Create `eureka-news/tests/fixtures/rss/sample_feed.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Sample Feed</title>
    <item>
      <title>Board of Aldermen approves new budget</title>
      <link>https://example.com/article-1</link>
      <description>The Eureka Board of Aldermen voted to approve the fiscal year budget.</description>
      <pubDate>Mon, 10 Aug 2026 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Old article outside window</title>
      <link>https://example.com/article-2</link>
      <description>This is an old article.</description>
      <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
```

Create `eureka-news/tests/test_adapters_rss.py`:

```python
from datetime import date
from pathlib import Path
from unittest.mock import Mock, patch

from eureka_news.adapters.rss import RssAdapter

FIXTURE = Path(__file__).parent / "fixtures" / "rss" / "sample_feed.xml"


def test_rss_adapter_filters_by_window_and_normalizes_fields():
    adapter = RssAdapter(name="Sample Feed", feed_url="https://example.com/feed.xml", category_hint="government")
    fake_response = Mock()
    fake_response.content = FIXTURE.read_bytes()
    fake_response.raise_for_status = Mock()

    with patch("eureka_news.adapters.rss.requests.get", return_value=fake_response) as mock_get:
        items = adapter.fetch(since=date(2026, 8, 1), until=date(2026, 8, 17))

    mock_get.assert_called_once()
    assert mock_get.call_args.kwargs["headers"]["User-Agent"] == "EurekaNewsAggregator/1.0"
    assert len(items) == 1
    assert items[0].title == "Board of Aldermen approves new budget"
    assert items[0].url == "https://example.com/article-1"
    assert items[0].published_date == date(2026, 8, 10)
    assert items[0].source == "Sample Feed"
    assert items[0].category_hint == "government"


def test_rss_adapter_raises_on_http_error():
    adapter = RssAdapter(name="Sample Feed", feed_url="https://example.com/feed.xml")
    fake_response = Mock()
    fake_response.raise_for_status.side_effect = RuntimeError("HTTP 500")

    with patch("eureka_news.adapters.rss.requests.get", return_value=fake_response):
        try:
            adapter.fetch(since=date(2026, 8, 1), until=date(2026, 8, 17))
            assert False, "expected RuntimeError to propagate"
        except RuntimeError:
            pass
```

Create `eureka-news/tests/fixtures/yaml/sources_sample.yaml`:

```yaml
rss_sources:
  - name: "Sample Source A"
    url: "https://example.com/a.xml"
    category_hint: "government"
  - name: "Sample Source B"
    url: "https://example.com/b.xml"
```

Create `eureka-news/tests/test_adapters_rss_config.py`:

```python
from pathlib import Path
from eureka_news.adapters.rss_config import load_rss_adapters

FIXTURE = Path(__file__).parent / "fixtures" / "yaml" / "sources_sample.yaml"


def test_load_rss_adapters_builds_adapter_per_entry():
    adapters = load_rss_adapters(FIXTURE)
    assert len(adapters) == 2
    assert adapters[0].name == "Sample Source A"
    assert adapters[0].feed_url == "https://example.com/a.xml"
    assert adapters[0].category_hint == "government"
    assert adapters[1].category_hint is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_adapters_rss.py tests/test_adapters_rss_config.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'eureka_news.adapters.rss'`

- [ ] **Step 3: Implement rss.py and rss_config.py**

Create `eureka-news/src/eureka_news/adapters/rss.py`:

```python
from datetime import date, datetime

import feedparser
import requests

from eureka_news.models import NormalizedItem


class RssAdapter:
    def __init__(
        self,
        name: str,
        feed_url: str,
        category_hint: str | None = None,
        user_agent: str = "EurekaNewsAggregator/1.0",
    ):
        self.name = name
        self.feed_url = feed_url
        self.category_hint = category_hint
        self.user_agent = user_agent

    def fetch(self, since: date, until: date) -> list[NormalizedItem]:
        response = requests.get(self.feed_url, headers={"User-Agent": self.user_agent}, timeout=10)
        response.raise_for_status()
        parsed = feedparser.parse(response.content)
        items = []
        for entry in parsed.entries:
            published = _entry_date(entry)
            if published is None or not (since <= published <= until):
                continue
            items.append(
                NormalizedItem(
                    source=self.name,
                    url=entry.get("link", ""),
                    title=entry.get("title", ""),
                    text=entry.get("summary", ""),
                    published_date=published,
                    category_hint=self.category_hint,
                )
            )
        return items


def _entry_date(entry) -> date | None:
    parsed_time = entry.get("published_parsed") or entry.get("updated_parsed")
    if parsed_time is None:
        return None
    return datetime(*parsed_time[:6]).date()
```

Create `eureka-news/src/eureka_news/adapters/rss_config.py`:

```python
from pathlib import Path

import yaml

from eureka_news.adapters.rss import RssAdapter


def load_rss_adapters(config_path: Path) -> list[RssAdapter]:
    data = yaml.safe_load(config_path.read_text())
    return [
        RssAdapter(
            name=entry["name"],
            feed_url=entry["url"],
            category_hint=entry.get("category_hint"),
        )
        for entry in data.get("rss_sources", [])
    ]
```

Create `eureka-news/config/sources.yaml`:

```yaml
rss_sources:
  - name: "City of Eureka - News Flash"
    url: "https://www.eureka.mo.us/RSSFeed.aspx?ModID=1&CID=All-newsflash.xml"
    category_hint: "government"
  - name: "City of Eureka - Alert Center"
    url: "https://www.eureka.mo.us/RSSFeed.aspx?ModID=63&CID=All-0"
    category_hint: "government"
  - name: "City of Eureka - Blog"
    url: "https://www.eureka.mo.us/RSSFeed.aspx?ModID=51&CID=All-blog.xml"
    category_hint: "government"
  - name: "City of Eureka - Board of Aldermen Agendas"
    url: "https://www.eureka.mo.us/RSSFeed.aspx?ModID=65&CID=Board-of-Aldermen-2"
    category_hint: "government"
  - name: "FOX2 News"
    url: "https://fox2now.com/news/feed/"
  - name: "KSDK - Crime"
    url: "https://www.ksdk.com/feeds/syndication/rss/news/crime"
    category_hint: "crime_safety"
  - name: "KSDK - Local"
    url: "https://www.ksdk.com/feeds/syndication/rss/news/local"
  - name: "KSDK - Politics"
    url: "https://www.ksdk.com/feeds/syndication/rss/news/politics"
    category_hint: "government"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_adapters_rss.py tests/test_adapters_rss_config.py -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add eureka-news/src/eureka_news/adapters/rss.py eureka-news/src/eureka_news/adapters/rss_config.py eureka-news/config/sources.yaml eureka-news/tests/fixtures/rss eureka-news/tests/fixtures/yaml eureka-news/tests/test_adapters_rss.py eureka-news/tests/test_adapters_rss_config.py
git commit -m "feat: add generic RSS adapter and config-driven source loading"
```

---

### Task 5: USGS Water Services adapter

**Files:**
- Create: `eureka-news/src/eureka_news/adapters/usgs.py`
- Create: `eureka-news/tests/fixtures/json/usgs_sample.json`
- Test: `eureka-news/tests/test_adapters_usgs.py`

**Interfaces:**
- Consumes: `NormalizedItem` from `eureka_news.models`
- Produces: `UsgsAdapter` (no constructor args, `.name` attribute, `.fetch(since, until) -> list[NormalizedItem]`). Returns at most one item, dated today, only when `[since, until]` includes today (a live-gauge reading has no meaningful historical range in v1).

- [ ] **Step 1: Write the failing test**

Create `eureka-news/tests/fixtures/json/usgs_sample.json`:

```json
{
  "value": {
    "timeSeries": [
      {
        "variable": {
          "variableCode": [{"value": "00060"}],
          "variableName": "Streamflow, ft&#179;/s"
        },
        "values": [
          {
            "value": [
              {"value": "450", "qualifiers": ["P"], "dateTime": "2026-08-17T12:00:00.000-05:00"}
            ]
          }
        ]
      },
      {
        "variable": {
          "variableCode": [{"value": "00065"}],
          "variableName": "Gage height, ft"
        },
        "values": [
          {
            "value": [
              {"value": "3.2", "qualifiers": ["P"], "dateTime": "2026-08-17T12:00:00.000-05:00"}
            ]
          }
        ]
      }
    ]
  }
}
```

Create `eureka-news/tests/test_adapters_usgs.py`:

```python
import json
from datetime import date
from pathlib import Path
from unittest.mock import Mock, patch

from eureka_news.adapters.usgs import UsgsAdapter

FIXTURE = Path(__file__).parent / "fixtures" / "json" / "usgs_sample.json"


def test_usgs_adapter_returns_current_reading_when_window_includes_today(monkeypatch):
    monkeypatch.setattr("eureka_news.adapters.usgs.date", _FixedDate)
    adapter = UsgsAdapter()
    fake_response = Mock()
    fake_response.json.return_value = json.loads(FIXTURE.read_text())
    fake_response.raise_for_status = Mock()

    with patch("eureka_news.adapters.usgs.requests.get", return_value=fake_response):
        items = adapter.fetch(since=date(2026, 8, 10), until=date(2026, 8, 31))

    assert len(items) == 1
    assert items[0].published_date == date(2026, 8, 17)
    assert "450" in items[0].text
    assert "3.2" in items[0].text


def test_usgs_adapter_returns_nothing_when_window_excludes_today(monkeypatch):
    monkeypatch.setattr("eureka_news.adapters.usgs.date", _FixedDate)
    adapter = UsgsAdapter()
    with patch("eureka_news.adapters.usgs.requests.get") as mock_get:
        items = adapter.fetch(since=date(2020, 1, 1), until=date(2020, 1, 31))
    mock_get.assert_not_called()
    assert items == []


class _FixedDate(date):
    @classmethod
    def today(cls):
        return date(2026, 8, 17)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_adapters_usgs.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'eureka_news.adapters.usgs'`

- [ ] **Step 3: Implement usgs.py**

Create `eureka-news/src/eureka_news/adapters/usgs.py`:

```python
from datetime import date

import requests

from eureka_news.models import NormalizedItem

USGS_URL = "https://waterservices.usgs.gov/nwis/iv/?sites=07019000&format=json&parameterCd=00060,00065"
GAUGE_PAGE_URL = "https://waterdata.usgs.gov/monitoring-location/07019000/"


class UsgsAdapter:
    name = "USGS Meramec River Gauge (Eureka, site 07019000)"

    def fetch(self, since: date, until: date) -> list[NormalizedItem]:
        today = date.today()
        if not (since <= today <= until):
            return []

        response = requests.get(USGS_URL, timeout=10)
        response.raise_for_status()
        data = response.json()

        readings: dict[str, str] = {}
        for series in data["value"]["timeSeries"]:
            code = series["variable"]["variableCode"][0]["value"]
            values = series["values"][0]["value"]
            if values:
                readings[code] = values[-1]["value"]

        discharge = readings.get("00060")
        gauge_height = readings.get("00065")
        text = f"Discharge: {discharge} cfs, Gauge height: {gauge_height} ft"

        return [
            NormalizedItem(
                source=self.name,
                url=GAUGE_PAGE_URL,
                title="Meramec River at Eureka: current conditions",
                text=text,
                published_date=today,
                category_hint="meramec_river",
            )
        ]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_adapters_usgs.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add eureka-news/src/eureka_news/adapters/usgs.py eureka-news/tests/fixtures/json/usgs_sample.json eureka-news/tests/test_adapters_usgs.py
git commit -m "feat: add USGS Meramec River gauge adapter"
```

---

### Task 6: NWS NWPS adapter

**Files:**
- Create: `eureka-news/src/eureka_news/adapters/nws.py`
- Create: `eureka-news/tests/fixtures/json/nws_sample.json`
- Test: `eureka-news/tests/test_adapters_nws.py`

**Interfaces:**
- Consumes: `NormalizedItem` from `eureka_news.models`
- Produces: `NwsAdapter` (`.name`, `.fetch(since, until) -> list[NormalizedItem]`), same today-inclusion behavior as `UsgsAdapter`.

- [ ] **Step 1: Write the failing test**

Create `eureka-news/tests/fixtures/json/nws_sample.json`:

```json
{
  "status": {
    "observed": {
      "primary": 3.45,
      "primaryUnit": "ft",
      "secondary": 1.17,
      "secondaryUnit": "kcfs",
      "floodCategory": "no_flooding",
      "validTime": "2026-08-17T01:30:00Z"
    },
    "forecast": {
      "primary": -999,
      "floodCategory": "fcst_not_current"
    }
  },
  "flood": {
    "categories": {
      "action": {"stage": 17},
      "minor": {"stage": 19},
      "moderate": {"stage": 26},
      "major": {"stage": 31}
    }
  }
}
```

Create `eureka-news/tests/test_adapters_nws.py`:

```python
import json
from datetime import date
from pathlib import Path
from unittest.mock import Mock, patch

from eureka_news.adapters.nws import NwsAdapter

FIXTURE = Path(__file__).parent / "fixtures" / "json" / "nws_sample.json"


def test_nws_adapter_reports_observed_stage_and_no_flooding(monkeypatch):
    monkeypatch.setattr("eureka_news.adapters.nws.date", _FixedDate)
    adapter = NwsAdapter()
    fake_response = Mock()
    fake_response.json.return_value = json.loads(FIXTURE.read_text())
    fake_response.raise_for_status = Mock()

    with patch("eureka_news.adapters.nws.requests.get", return_value=fake_response):
        items = adapter.fetch(since=date(2026, 8, 10), until=date(2026, 8, 31))

    assert len(items) == 1
    assert "no flooding" in items[0].title
    assert "3.45" in items[0].text
    assert "Forecast" not in items[0].text  # -999 sentinel must be suppressed


def test_nws_adapter_includes_forecast_when_present(monkeypatch):
    monkeypatch.setattr("eureka_news.adapters.nws.date", _FixedDate)
    adapter = NwsAdapter()
    data = json.loads(FIXTURE.read_text())
    data["status"]["forecast"]["primary"] = 18.5
    data["status"]["forecast"]["floodCategory"] = "action"
    fake_response = Mock()
    fake_response.json.return_value = data
    fake_response.raise_for_status = Mock()

    with patch("eureka_news.adapters.nws.requests.get", return_value=fake_response):
        items = adapter.fetch(since=date(2026, 8, 10), until=date(2026, 8, 31))

    assert "Forecast stage: 18.5" in items[0].text


class _FixedDate(date):
    @classmethod
    def today(cls):
        return date(2026, 8, 17)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_adapters_nws.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'eureka_news.adapters.nws'`

- [ ] **Step 3: Implement nws.py**

Create `eureka-news/src/eureka_news/adapters/nws.py`:

```python
from datetime import date

import requests

from eureka_news.models import NormalizedItem

NWS_URL = "https://api.water.noaa.gov/nwps/v1/gauges/erkm7"
GAUGE_PAGE_URL = "https://water.noaa.gov/gauges/erkm7"
NO_FORECAST_SENTINEL = -999


class NwsAdapter:
    name = "NWS Meramec River Forecast (Eureka, gauge erkm7)"

    def fetch(self, since: date, until: date) -> list[NormalizedItem]:
        today = date.today()
        if not (since <= today <= until):
            return []

        response = requests.get(NWS_URL, timeout=10)
        response.raise_for_status()
        data = response.json()

        observed = data["status"]["observed"]
        stage = observed["primary"]
        unit = observed.get("primaryUnit", "ft")
        category = observed["floodCategory"]

        forecast = data["status"].get("forecast", {})
        forecast_stage = forecast.get("primary")
        forecast_text = ""
        if forecast_stage is not None and forecast_stage != NO_FORECAST_SENTINEL:
            forecast_text = f" Forecast stage: {forecast_stage} {unit} ({forecast.get('floodCategory', 'unknown')})."

        title = f"Meramec River at Eureka: {category.replace('_', ' ')}"
        text = f"Observed stage: {stage} {unit} (category: {category})." + forecast_text

        return [
            NormalizedItem(
                source=self.name,
                url=GAUGE_PAGE_URL,
                title=title,
                text=text,
                published_date=today,
                category_hint="meramec_river",
            )
        ]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_adapters_nws.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add eureka-news/src/eureka_news/adapters/nws.py eureka-news/tests/fixtures/json/nws_sample.json eureka-news/tests/test_adapters_nws.py
git commit -m "feat: add NWS NWPS river forecast adapter"
```

---

### Task 7: St. Louis County Council D3 scraper adapter

**Files:**
- Create: `eureka-news/src/eureka_news/adapters/county_council.py`
- Create: `eureka-news/tests/fixtures/html/county_council_meeting_type_list.html`
- Test: `eureka-news/tests/test_adapters_county_council.py`

**Interfaces:**
- Consumes: `NormalizedItem` from `eureka_news.models`
- Produces: `CountyCouncilAdapter` (`.name`, `.fetch(since, until) -> list[NormalizedItem]`). v1 scope: agenda-surfacing only (title, date, agenda-detail link) — no PDF text parsing, per spec Decisions.

- [ ] **Step 1: Write the failing test**

Create `eureka-news/tests/fixtures/html/county_council_meeting_type_list.html`:

```html
<html>
<body>
  <div class="meeting-type-item">
    <div class="meeting-type-item-title"><h2>
      <a href="/Portal/MeetingInformation.aspx?type=10" class="meeting-type-item-title">County Council - Regular Meeting</a>
    </h2></div>
    <div class="meeting-type-links item-description">
      <ol>
        <li><span class="list-custom-bullet-document background-color"></span>
          <a class="list-link" href="/Portal/MeetingInformation.aspx?Id=26880">County Council - Regular Meeting - Aug 18 2026</a>
        </li>
        <li><span class="list-custom-bullet-document background-color"></span>
          <a class="list-link" href="/Portal/MeetingInformation.aspx?Id=26881">County Council - Regular Meeting - Jan 5 2024</a>
        </li>
      </ol>
    </div>
  </div>
  <div class="meeting-type-item">
    <div class="meeting-type-item-title"><h2>
      <a href="/Portal/MeetingInformation.aspx?type=4" class="meeting-type-item-title">Planning Commission</a>
    </h2></div>
    <div class="meeting-type-links item-description">
      <ol>
        <li><span class="list-custom-bullet-document background-color"></span>
          <a class="list-link" href="/Portal/MeetingInformation.aspx?Id=99999">Planning Commission - Regular Meeting - Aug 19 2026</a>
        </li>
      </ol>
    </div>
  </div>
</body>
</html>
```

Create `eureka-news/tests/test_adapters_county_council.py`:

```python
from datetime import date
from pathlib import Path
from unittest.mock import Mock, patch

from eureka_news.adapters.county_council import CountyCouncilAdapter

FIXTURE = Path(__file__).parent / "fixtures" / "html" / "county_council_meeting_type_list.html"


def test_county_council_adapter_returns_only_council_meetings_in_window():
    adapter = CountyCouncilAdapter()
    fake_response = Mock()
    fake_response.text = FIXTURE.read_text()
    fake_response.raise_for_status = Mock()

    with patch("eureka_news.adapters.county_council.requests.get", return_value=fake_response):
        items = adapter.fetch(since=date(2026, 8, 1), until=date(2026, 8, 31))

    assert len(items) == 1
    assert "County Council" in items[0].title
    assert items[0].published_date == date(2026, 8, 18)
    assert items[0].url == "https://stlouisco.civicweb.net/Portal/MeetingInformation.aspx?Id=26880"
    assert items[0].category_hint == "government"


def test_county_council_adapter_excludes_meetings_outside_window():
    adapter = CountyCouncilAdapter()
    fake_response = Mock()
    fake_response.text = FIXTURE.read_text()
    fake_response.raise_for_status = Mock()

    with patch("eureka_news.adapters.county_council.requests.get", return_value=fake_response):
        items = adapter.fetch(since=date(2020, 1, 1), until=date(2020, 1, 31))

    assert items == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_adapters_county_council.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'eureka_news.adapters.county_council'`

- [ ] **Step 3: Implement county_council.py**

Create `eureka-news/src/eureka_news/adapters/county_council.py`:

```python
import re
from datetime import date, datetime

import requests
from bs4 import BeautifulSoup

from eureka_news.models import NormalizedItem

MEETING_TYPE_LIST_URL = "https://stlouisco.civicweb.net/Portal/MeetingTypeList.aspx"
BASE_URL = "https://stlouisco.civicweb.net"
_DATE_PATTERN = re.compile(r"-\s*([A-Za-z]{3,9} \d{1,2} \d{4})\s*$")
_WANTED_TYPE_PREFIX = "County Council"


class CountyCouncilAdapter:
    name = "St. Louis County Council"

    def fetch(self, since: date, until: date) -> list[NormalizedItem]:
        response = requests.get(MEETING_TYPE_LIST_URL, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        items = []
        for link in soup.select("a.list-link"):
            text = link.get_text(strip=True)
            if _WANTED_TYPE_PREFIX not in text:
                continue
            meeting_date = _parse_date(text)
            if meeting_date is None or not (since <= meeting_date <= until):
                continue
            href = link.get("href", "")
            url = BASE_URL + href if href.startswith("/") else href
            items.append(
                NormalizedItem(
                    source=self.name,
                    url=url,
                    title=text,
                    text=(
                        f"St. Louis County Council meeting scheduled for "
                        f"{meeting_date.isoformat()}. See the agenda at the meeting link."
                    ),
                    published_date=meeting_date,
                    category_hint="government",
                )
            )
        return items


def _parse_date(text: str) -> date | None:
    match = _DATE_PATTERN.search(text)
    if not match:
        return None
    raw = match.group(1)
    for fmt in ("%b %d %Y", "%B %d %Y"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_adapters_county_council.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add eureka-news/src/eureka_news/adapters/county_council.py eureka-news/tests/fixtures/html/county_council_meeting_type_list.html eureka-news/tests/test_adapters_county_council.py
git commit -m "feat: add St. Louis County Council meeting-agenda scraper"
```

---

### Task 8: Rockwood School District scraper adapter

**Files:**
- Create: `eureka-news/src/eureka_news/adapters/rockwood.py`
- Create: `eureka-news/tests/fixtures/html/rockwood_news.html`
- Test: `eureka-news/tests/test_adapters_rockwood.py`

**Interfaces:**
- Consumes: `NormalizedItem` from `eureka_news.models`
- Produces: `RockwoodAdapter` (`.name`, `.fetch(since, until) -> list[NormalizedItem]`)

**Implementation note (from spec Open Items):** the live page's exact date-element markup was not confirmed during research. This task's selector (`time[datetime]` inside each `article[data-post-id]`) is a reasonable, complete, testable choice — but must be verified against the live page during rollout (see Task 18 smoke-test step) and adjusted if Finalsite renders the date differently.

- [ ] **Step 1: Write the failing test**

Create `eureka-news/tests/fixtures/html/rockwood_news.html`:

```html
<html>
<body>
  <div class="fsElementNews">
    <article class="fsStyleAutoclear fsBoard-78 fsTag-22 fsFeaturedPost" data-post-id="4192" aria-labelledby="fsArticle_51473_4192">
      <a class="fsThumbnail fsPostLink" data-slug="rsd/post/back-to-school-guide" data-page-id="9331"
         href="https://www.rsdmo.org/news/article/~board/rsd/post/the-rockwood-school-district-back-to-school-guide-2026-2027">
        <img src="thumb.jpg" alt="">
      </a>
      <a class="fsPostLink" data-slug="rsd/post/back-to-school-guide"
         href="https://www.rsdmo.org/news/article/~board/rsd/post/the-rockwood-school-district-back-to-school-guide-2026-2027">
        The Rockwood School District Back-to-School Guide 2026-2027
      </a>
      <time datetime="2026-08-10">August 10, 2026</time>
    </article>
    <article class="fsStyleAutoclear fsBoard-78 fsTag-22" data-post-id="4001" aria-labelledby="fsArticle_51473_4001">
      <a class="fsPostLink" data-slug="rsd/post/old-story"
         href="https://www.rsdmo.org/news/article/~board/rsd/post/old-story">
        Old story from last year
      </a>
      <time datetime="2024-01-05">January 5, 2024</time>
    </article>
  </div>
</body>
</html>
```

Create `eureka-news/tests/test_adapters_rockwood.py`:

```python
from datetime import date
from pathlib import Path
from unittest.mock import Mock, patch

from eureka_news.adapters.rockwood import RockwoodAdapter

FIXTURE = Path(__file__).parent / "fixtures" / "html" / "rockwood_news.html"


def test_rockwood_adapter_parses_articles_in_window():
    adapter = RockwoodAdapter()
    fake_response = Mock()
    fake_response.text = FIXTURE.read_text()
    fake_response.raise_for_status = Mock()

    with patch("eureka_news.adapters.rockwood.requests.get", return_value=fake_response):
        items = adapter.fetch(since=date(2026, 8, 1), until=date(2026, 8, 31))

    assert len(items) == 1
    assert "Back-to-School Guide" in items[0].title
    assert items[0].published_date == date(2026, 8, 10)
    assert items[0].url == "https://www.rsdmo.org/news/article/~board/rsd/post/the-rockwood-school-district-back-to-school-guide-2026-2027"
    assert items[0].category_hint == "schools"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_adapters_rockwood.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'eureka_news.adapters.rockwood'`

- [ ] **Step 3: Implement rockwood.py**

Create `eureka-news/src/eureka_news/adapters/rockwood.py`:

```python
from datetime import date, datetime

import requests
from bs4 import BeautifulSoup

from eureka_news.models import NormalizedItem

ROCKWOOD_NEWS_URL = "https://www.rsdmo.org/news"


class RockwoodAdapter:
    name = "Rockwood School District News"

    def fetch(self, since: date, until: date) -> list[NormalizedItem]:
        response = requests.get(ROCKWOOD_NEWS_URL, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        items = []
        for article in soup.select("article[data-post-id]"):
            link = article.select_one("a.fsPostLink[href]")
            time_tag = article.select_one("time[datetime]")
            if link is None or time_tag is None:
                continue
            published = _parse_date(time_tag["datetime"])
            if published is None or not (since <= published <= until):
                continue
            title = link.get_text(strip=True)
            items.append(
                NormalizedItem(
                    source=self.name,
                    url=link["href"],
                    title=title,
                    text=title,
                    published_date=published,
                    category_hint="schools",
                )
            )
        return items


def _parse_date(raw: str) -> date | None:
    try:
        return datetime.fromisoformat(raw).date()
    except ValueError:
        return None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_adapters_rockwood.py -v`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add eureka-news/src/eureka_news/adapters/rockwood.py eureka-news/tests/fixtures/html/rockwood_news.html eureka-news/tests/test_adapters_rockwood.py
git commit -m "feat: add Rockwood School District news scraper"
```

---

### Task 9: Brookdale Farms scraper adapter (link discovery + JSON-LD)

**Files:**
- Create: `eureka-news/src/eureka_news/adapters/brookdale.py`
- Create: `eureka-news/tests/fixtures/html/brookdale_events_calendar.html`
- Create: `eureka-news/tests/fixtures/html/brookdale_event_detail.html`
- Test: `eureka-news/tests/test_adapters_brookdale.py`

**Interfaces:**
- Consumes: `NormalizedItem` from `eureka_news.models`
- Produces: `BrookdaleAdapter` (`.name`, `.fetch(since, until) -> list[NormalizedItem]`). Two-step fetch: discover event URLs from static links on the listing page, then parse `schema.org/Event` JSON-LD from each event's detail page.

- [ ] **Step 1: Write the failing test**

Create `eureka-news/tests/fixtures/html/brookdale_events_calendar.html`:

```html
<html>
<body>
  <div id="events-widget">Loading events...</div>
  <footer>
    <div class="wixui-rich-text__text">
      <a href="https://www.brookdalefarms.com/events-1/eureka-trivia-night-10-27-2025">Eureka Trivia Night</a>
      <a href="https://www.brookdalefarms.com/events-1/fall-festival-2026">Fall Festival</a>
      <a href="https://www.brookdalefarms.com/float-trips">Float Trips</a>
    </div>
  </footer>
</body>
</html>
```

Create `eureka-news/tests/fixtures/html/brookdale_event_detail.html`:

```html
<html>
<body>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Event",
"name":"Eureka! Trivia Night - Halloween Spooktacular | 2025",
"description":"Spooky trivia night is here! Test your knowledge of movies, monsters, and more.",
"startDate":"2025-10-27T18:00:00-05:00","endDate":"2025-10-27T21:00:00-05:00",
"eventStatus":"https://schema.org/EventScheduled",
"eventAttendanceMode":"https://schema.org/OfflineEventAttendanceMode",
"location":{"@type":"Place","name":"Silo Point","address":"7916 Twin River Rd, Eureka, MO 63025"}}
</script>
</body>
</html>
```

Create `eureka-news/tests/test_adapters_brookdale.py`:

```python
from datetime import date
from pathlib import Path
from unittest.mock import Mock, patch

from eureka_news.adapters.brookdale import EVENTS_CALENDAR_URL, BrookdaleAdapter

LISTING_FIXTURE = Path(__file__).parent / "fixtures" / "html" / "brookdale_events_calendar.html"
DETAIL_FIXTURE = Path(__file__).parent / "fixtures" / "html" / "brookdale_event_detail.html"


def _fake_get(url, *args, **kwargs):
    response = Mock()
    response.raise_for_status = Mock()
    if url == EVENTS_CALENDAR_URL:
        response.text = LISTING_FIXTURE.read_text()
    else:
        response.text = DETAIL_FIXTURE.read_text()
    return response


def test_brookdale_adapter_discovers_and_parses_events_in_window():
    adapter = BrookdaleAdapter()
    with patch("eureka_news.adapters.brookdale.requests.get", side_effect=_fake_get):
        items = adapter.fetch(since=date(2025, 10, 1), until=date(2025, 10, 31))

    assert len(items) == 1
    assert items[0].title == "Eureka! Trivia Night - Halloween Spooktacular | 2025"
    assert items[0].published_date == date(2025, 10, 27)
    assert items[0].url == "https://www.brookdalefarms.com/events-1/eureka-trivia-night-10-27-2025"
    assert items[0].category_hint == "community_events"


def test_brookdale_adapter_excludes_non_event_links():
    adapter = BrookdaleAdapter()
    with patch("eureka_news.adapters.brookdale.requests.get", side_effect=_fake_get) as mock_get:
        adapter.fetch(since=date(2025, 10, 1), until=date(2025, 10, 31))

    requested_urls = [call.args[0] for call in mock_get.call_args_list]
    assert "https://www.brookdalefarms.com/float-trips" not in requested_urls
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_adapters_brookdale.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'eureka_news.adapters.brookdale'`

- [ ] **Step 3: Implement brookdale.py**

Create `eureka-news/src/eureka_news/adapters/brookdale.py`:

```python
import json
import re
from datetime import date, datetime

import requests
from bs4 import BeautifulSoup

from eureka_news.models import NormalizedItem

EVENTS_CALENDAR_URL = "https://www.brookdalefarms.com/events-calendar"
_EVENT_LINK_PATTERN = re.compile(r"^https://www\.brookdalefarms\.com/events-1/[\w-]+")


class BrookdaleAdapter:
    name = "Brookdale Farms Events"

    def fetch(self, since: date, until: date) -> list[NormalizedItem]:
        listing = requests.get(EVENTS_CALENDAR_URL, timeout=10)
        listing.raise_for_status()
        soup = BeautifulSoup(listing.text, "html.parser")

        event_urls = sorted(
            {a["href"] for a in soup.select("a[href]") if _EVENT_LINK_PATTERN.match(a["href"])}
        )

        items = []
        for url in event_urls:
            item = self._fetch_event(url, since, until)
            if item is not None:
                items.append(item)
        return items

    def _fetch_event(self, url: str, since: date, until: date) -> NormalizedItem | None:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        script = soup.find("script", type="application/ld+json")
        if script is None or script.string is None:
            return None
        data = json.loads(script.string)
        if data.get("@type") != "Event":
            return None
        start = _parse_date(data.get("startDate", ""))
        if start is None or not (since <= start <= until):
            return None
        return NormalizedItem(
            source=self.name,
            url=url,
            title=data.get("name", "Brookdale Farms Event"),
            text=data.get("description", ""),
            published_date=start,
            category_hint="community_events",
        )


def _parse_date(raw: str) -> date | None:
    try:
        return datetime.fromisoformat(raw).date()
    except ValueError:
        return None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_adapters_brookdale.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add eureka-news/src/eureka_news/adapters/brookdale.py eureka-news/tests/fixtures/html/brookdale_events_calendar.html eureka-news/tests/fixtures/html/brookdale_event_detail.html eureka-news/tests/test_adapters_brookdale.py
git commit -m "feat: add Brookdale Farms events scraper via link discovery and JSON-LD"
```

---

### Task 10: Eureka Chamber of Commerce Playwright adapter

**Files:**
- Create: `eureka-news/src/eureka_news/adapters/chamber.py`
- Create: `eureka-news/tests/fixtures/html/chamber_events.html`
- Test: `eureka-news/tests/test_adapters_chamber.py`

**Interfaces:**
- Consumes: `NormalizedItem` from `eureka_news.models`
- Produces: `ChamberAdapter(events_url: str = EVENTS_URL)` (`.name`, `.fetch(since, until) -> list[NormalizedItem]`). Uses Playwright (headless Chromium) to render the JS-hydrated Wix events widget. The `events_url` constructor parameter exists specifically so tests can point it at a local fixture file instead of the live site.

**Implementation note (from spec Open Items):** the exact Wix Events widget selectors (`data-hook` attribute values) were not confirmed against the live rendered DOM during research — the events page requires JS execution to inspect, which research explicitly did not do. This task's selectors are a reasonable starting point; verify against the live site with Playwright's inspector/codegen during the Task 18 smoke test and adjust if they don't match.

- [ ] **Step 1: Write the failing test**

Create `eureka-news/tests/fixtures/html/chamber_events.html`:

```html
<!DOCTYPE html>
<html>
<body>
  <div data-hook="event-list-item">
    <h3 data-hook="ev-list-item-title">Business After Hours Mixer</h3>
    <span data-hook="ev-list-item-short-date">Aug 20, 2026</span>
    <a href="https://www.eurekachamber.org/event-details/business-after-hours-mixer">Details</a>
  </div>
  <div data-hook="event-list-item">
    <h3 data-hook="ev-list-item-title">Old Ribbon Cutting</h3>
    <span data-hook="ev-list-item-short-date">Jan 5, 2024</span>
    <a href="https://www.eurekachamber.org/event-details/old-ribbon-cutting">Details</a>
  </div>
</body>
</html>
```

Create `eureka-news/tests/test_adapters_chamber.py`:

```python
from datetime import date
from pathlib import Path

import pytest

from eureka_news.adapters.chamber import ChamberAdapter

FIXTURE = Path(__file__).parent / "fixtures" / "html" / "chamber_events.html"


@pytest.mark.playwright
def test_chamber_adapter_parses_rendered_events_in_window():
    adapter = ChamberAdapter(events_url=FIXTURE.resolve().as_uri())
    items = adapter.fetch(since=date(2026, 8, 1), until=date(2026, 8, 31))

    assert len(items) == 1
    assert items[0].title == "Business After Hours Mixer"
    assert items[0].published_date == date(2026, 8, 20)
    assert items[0].url == "https://www.eurekachamber.org/event-details/business-after-hours-mixer"
    assert items[0].category_hint == "local_business"
```

- [ ] **Step 2: Register the `playwright` marker and install the browser binary**

Create `eureka-news/pytest.ini`:

```ini
[pytest]
markers =
    playwright: requires a local Chromium binary (run `uv run playwright install chromium` once)
```

Run once: `cd eureka-news && uv run playwright install chromium`

- [ ] **Step 3: Run test to verify it fails**

Run: `uv run pytest tests/test_adapters_chamber.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'eureka_news.adapters.chamber'`

- [ ] **Step 4: Implement chamber.py**

Create `eureka-news/src/eureka_news/adapters/chamber.py`:

```python
from datetime import date, datetime

from playwright.sync_api import sync_playwright

from eureka_news.models import NormalizedItem

EVENTS_URL = "https://www.eurekachamber.org/events"

_EXTRACT_SCRIPT = """
elements => elements.map(el => ({
    title: el.querySelector('[data-hook="ev-list-item-title"]')?.textContent?.trim() || '',
    dateText: el.querySelector('[data-hook="ev-list-item-short-date"]')?.textContent?.trim() || '',
    url: el.querySelector('a')?.href || ''
}))
"""


class ChamberAdapter:
    name = "Eureka Chamber of Commerce Events"

    def __init__(self, events_url: str = EVENTS_URL):
        self.events_url = events_url

    def fetch(self, since: date, until: date) -> list[NormalizedItem]:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            try:
                page = browser.new_page()
                page.goto(self.events_url, wait_until="networkidle", timeout=15000)
                events = page.eval_on_selector_all('[data-hook="event-list-item"]', _EXTRACT_SCRIPT)
            finally:
                browser.close()

        items = []
        for event in events:
            published = _parse_date(event["dateText"])
            if published is None or not (since <= published <= until):
                continue
            items.append(
                NormalizedItem(
                    source=self.name,
                    url=event["url"] or self.events_url,
                    title=event["title"] or "Eureka Chamber of Commerce Event",
                    text=event["title"],
                    published_date=published,
                    category_hint="local_business",
                )
            )
        return items


def _parse_date(raw: str) -> date | None:
    for fmt in ("%B %d, %Y", "%b %d, %Y"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None
```

- [ ] **Step 5: Run test to verify it passes**

Run: `uv run pytest tests/test_adapters_chamber.py -v -m playwright`
Expected: PASS (1 test)

- [ ] **Step 6: Commit**

```bash
git add eureka-news/src/eureka_news/adapters/chamber.py eureka-news/tests/fixtures/html/chamber_events.html eureka-news/tests/test_adapters_chamber.py eureka-news/pytest.ini
git commit -m "feat: add Eureka Chamber of Commerce events adapter via Playwright"
```

---

### Task 11: West News Magazine sitemap adapter

**Files:**
- Create: `eureka-news/src/eureka_news/adapters/west_news.py`
- Create: `eureka-news/tests/fixtures/sitemap/west_news_sitemap.xml`
- Test: `eureka-news/tests/test_adapters_west_news.py`

**Interfaces:**
- Consumes: `NormalizedItem` from `eureka_news.models`
- Produces: `WestNewsAdapter` (`.name`, `.fetch(since, until) -> list[NormalizedItem]`). Filters entries to ones mentioning Eureka/St. Louis County (via URL path or `news:keywords`) before date-filtering — most of the sitemap is irrelevant, so this cuts volume early. Uses `USER_AGENT`, a custom honestly-identifying string, never a spoofed browser UA (spec Decisions).

- [ ] **Step 1: Write the failing test**

Create `eureka-news/tests/fixtures/sitemap/west_news_sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://www.westnewsmagazine.com/schools/cbc-names-mike-seppi/article_09f9ebe8.html</loc>
    <news:news>
      <news:publication>
        <news:name>West Newsmagazine</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:title>CBC names Mike Seppi as new vice president and chief operating officer</news:title>
      <news:publication_date>2026-08-17T06:30:00-05:00</news:publication_date>
      <news:keywords>christian brothers college high school,culture of st. louis,st. louis county, missouri</news:keywords>
    </news:news>
  </url>
  <url>
    <loc>https://www.westnewsmagazine.com/news/eureka/new-cafe-opens/article_abc123.html</loc>
    <news:news>
      <news:publication>
        <news:name>West Newsmagazine</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:title>New cafe opens in downtown Eureka</news:title>
      <news:publication_date>2026-08-15T09:00:00-05:00</news:publication_date>
      <news:keywords>eureka,restaurants,small business</news:keywords>
    </news:news>
  </url>
  <url>
    <loc>https://www.westnewsmagazine.com/sports/chesterfield-team-wins/article_xyz789.html</loc>
    <news:news>
      <news:publication>
        <news:name>West Newsmagazine</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:title>Chesterfield team wins regional title</news:title>
      <news:publication_date>2026-08-16T09:00:00-05:00</news:publication_date>
      <news:keywords>sports,chesterfield</news:keywords>
    </news:news>
  </url>
</urlset>
```

Create `eureka-news/tests/test_adapters_west_news.py`:

```python
from datetime import date
from pathlib import Path
from unittest.mock import Mock, patch

from eureka_news.adapters.west_news import USER_AGENT, WestNewsAdapter

FIXTURE = Path(__file__).parent / "fixtures" / "sitemap" / "west_news_sitemap.xml"


def test_west_news_adapter_keeps_only_locally_relevant_entries_in_window():
    adapter = WestNewsAdapter()
    fake_response = Mock()
    fake_response.content = FIXTURE.read_bytes()
    fake_response.raise_for_status = Mock()

    with patch("eureka_news.adapters.west_news.requests.get", return_value=fake_response) as mock_get:
        items = adapter.fetch(since=date(2026, 8, 1), until=date(2026, 8, 31))

    assert mock_get.call_args.kwargs["headers"]["User-Agent"] == USER_AGENT
    assert "ClaudeBot" not in USER_AGENT and "Mozilla" not in USER_AGENT
    titles = {item.title for item in items}
    assert "New cafe opens in downtown Eureka" in titles
    assert "CBC names Mike Seppi as new vice president and chief operating officer" in titles
    assert "Chesterfield team wins regional title" not in titles


def test_west_news_adapter_respects_date_window():
    adapter = WestNewsAdapter()
    fake_response = Mock()
    fake_response.content = FIXTURE.read_bytes()
    fake_response.raise_for_status = Mock()

    with patch("eureka_news.adapters.west_news.requests.get", return_value=fake_response):
        items = adapter.fetch(since=date(2026, 8, 16), until=date(2026, 8, 31))

    titles = {item.title for item in items}
    assert "New cafe opens in downtown Eureka" not in titles  # published 8/15, outside window
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_adapters_west_news.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'eureka_news.adapters.west_news'`

- [ ] **Step 3: Implement west_news.py**

Create `eureka-news/src/eureka_news/adapters/west_news.py`:

```python
import xml.etree.ElementTree as ET
from datetime import date, datetime

import requests

from eureka_news.models import NormalizedItem

SITEMAP_URL = "https://www.westnewsmagazine.com/tncms/sitemap/news.xml"
USER_AGENT = (
    "EurekaNewsAggregator/1.0 "
    "(personal local-news tool for a resident of Eureka, MO; not for redistribution)"
)
LOCATION_TERMS = ("eureka", "st. louis county")

_NAMESPACES = {
    "sitemap": "http://www.sitemaps.org/schemas/sitemap/0.9",
    "news": "http://www.google.com/schemas/sitemap-news/0.9",
}


class WestNewsAdapter:
    name = "West News Magazine"

    def fetch(self, since: date, until: date) -> list[NormalizedItem]:
        response = requests.get(SITEMAP_URL, headers={"User-Agent": USER_AGENT}, timeout=10)
        response.raise_for_status()
        root = ET.fromstring(response.content)

        items = []
        for url_elem in root.findall("sitemap:url", _NAMESPACES):
            loc = url_elem.findtext("sitemap:loc", default="", namespaces=_NAMESPACES)
            news_elem = url_elem.find("news:news", _NAMESPACES)
            if news_elem is None:
                continue
            keywords = news_elem.findtext("news:keywords", default="", namespaces=_NAMESPACES)
            if not _is_locally_relevant(loc, keywords):
                continue
            published = _parse_date(
                news_elem.findtext("news:publication_date", default="", namespaces=_NAMESPACES)
            )
            if published is None or not (since <= published <= until):
                continue
            title = news_elem.findtext("news:title", default="", namespaces=_NAMESPACES)
            items.append(
                NormalizedItem(
                    source=self.name,
                    url=loc,
                    title=title,
                    text=keywords,
                    published_date=published,
                    category_hint=None,
                )
            )
        return items


def _is_locally_relevant(loc: str, keywords: str) -> bool:
    haystack = f"{loc} {keywords}".lower()
    return any(term in haystack for term in LOCATION_TERMS)


def _parse_date(raw: str) -> date | None:
    try:
        return datetime.fromisoformat(raw).date()
    except ValueError:
        return None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_adapters_west_news.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add eureka-news/src/eureka_news/adapters/west_news.py eureka-news/tests/fixtures/sitemap/west_news_sitemap.xml eureka-news/tests/test_adapters_west_news.py
git commit -m "feat: add West News Magazine sitemap adapter with honest User-Agent"
```

---

### Task 12: Relevance config loader (9-category profile)

**Files:**
- Create: `eureka-news/src/eureka_news/relevance/__init__.py`
- Create: `eureka-news/src/eureka_news/relevance/config.py`
- Create: `eureka-news/config/relevance.yaml`
- Create: `eureka-news/tests/fixtures/yaml/relevance_sample.yaml`
- Test: `eureka-news/tests/test_relevance_config.py`

**Interfaces:**
- Produces: `Category(id: str, display_name: str, keywords: list[str], rule: str)` — frozen dataclass; `load_categories(config_path: Path) -> list[Category]`, order preserved from the YAML file (this fixed order drives display order downstream).

- [ ] **Step 1: Write the failing test**

Create `eureka-news/tests/fixtures/yaml/relevance_sample.yaml`:

```yaml
categories:
  - id: government
    display_name: "City/County Government & Elections"
    keywords:
      - "board of aldermen"
      - "county council"
    rule: >
      Include votes or decisions that change laws, taxes, fees, or spending.
  - id: golf_carts
    display_name: "Golf Cart Legality"
    keywords:
      - "golf cart"
    rule: >
      Include anything about golf cart ordinances or legality.
```

Create `eureka-news/tests/test_relevance_config.py`:

```python
from pathlib import Path
from eureka_news.relevance.config import load_categories

FIXTURE = Path(__file__).parent / "fixtures" / "yaml" / "relevance_sample.yaml"


def test_load_categories_preserves_order_and_fields():
    categories = load_categories(FIXTURE)
    assert [c.id for c in categories] == ["government", "golf_carts"]
    assert categories[0].display_name == "City/County Government & Elections"
    assert "board of aldermen" in categories[0].keywords
    assert categories[0].rule.strip().startswith("Include votes or decisions")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_relevance_config.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'eureka_news.relevance'`

- [ ] **Step 3: Implement config.py**

Create `eureka-news/src/eureka_news/relevance/__init__.py` (empty file).

Create `eureka-news/src/eureka_news/relevance/config.py`:

```python
from dataclasses import dataclass
from pathlib import Path

import yaml


@dataclass(frozen=True)
class Category:
    id: str
    display_name: str
    keywords: list[str]
    rule: str


def load_categories(config_path: Path) -> list[Category]:
    data = yaml.safe_load(config_path.read_text())
    return [
        Category(
            id=entry["id"],
            display_name=entry["display_name"],
            keywords=entry.get("keywords", []),
            rule=entry["rule"].strip(),
        )
        for entry in data["categories"]
    ]
```

Create `eureka-news/config/relevance.yaml` — the full 9-category profile, transcribed from the spec's source brief:

```yaml
categories:
  - id: government
    display_name: "City/County Government & Elections"
    keywords:
      - "board of aldermen"
      - "county council"
      - "district 3"
      - "election"
      - "candidate"
      - "ordinance"
      - "tax"
      - "levy"
      - "budget"
      - "agenda"
    rule: >
      Include votes or decisions (City of Eureka Board of Aldermen, or St.
      Louis County Council District 3) that change laws, taxes, fees, or
      spending. Include meeting agendas surfaced before the meeting happens
      so the user can decide to attend. Include election/candidate news for
      races that affect Eureka voters (municipal, County Council D3, and
      relevant state legislative/congressional seats). Exclude routine
      procedural announcements, ribbon-cuttings, and generic "council met"
      stories with no decision content.

  - id: crime_safety
    display_name: "Crime & Public Safety"
    keywords:
      - "crime"
      - "shooting"
      - "robbery"
      - "assault"
      - "crash"
      - "closure"
      - "construction"
      - "policing"
      - "police"
    rule: >
      Include violent crime / major incidents (not petty theft or minor
      citations). Include traffic/road safety incidents: crashes, closures,
      construction affecting routes. Include policy changes (enacted or
      proposed) related to crime/policing — ordinances, funding, staffing.
      Exclude routine blotter items and minor DWI/citation reports unless
      tied to a policy story.

  - id: schools
    display_name: "Schools (Rockwood School District)"
    keywords:
      - "rockwood"
      - "eureka high"
      - "school board"
      - "dese"
      - "accreditation"
      - "bond"
      - "device policy"
      - "cell phone ban"
      - "ai policy"
    rule: >
      Include major controversies or safety incidents at the district or
      Eureka-area schools specifically. Include district/school ratings
      (state DESE ratings, notable rankings, accreditation changes). Include
      major decisions on technology use in schools (device policies, AI
      policy, ed-tech contracts, cell phone bans, etc.). Include Board of
      Education votes on funding/bonds/tax levies. Exclude sports scores,
      individual student achievement stories, and routine PTA/event
      announcements.

  - id: roads_utilities
    display_name: "Roads/Construction/Utilities"
    keywords:
      - "closure"
      - "water main"
      - "boil advisory"
      - "outage"
      - "i-44"
      - "highway 109"
      - "hwy 109"
      - "modot"
      - "construction"
    rule: >
      Include things that materially affect a resident's daily life:
      closures, water main breaks, utility outages, MoDOT project updates on
      I-44 or Hwy 109, boil advisories.

  - id: development_zoning
    display_name: "Development & Zoning"
    keywords:
      - "rezoning"
      - "zoning"
      - "variance"
      - "development"
      - "subdivision"
      - "public hearing"
    rule: >
      Include proposed/approved rezoning, new commercial or residential
      development in Eureka or unincorporated county land nearby, and
      variance requests that would go to a public hearing.

  - id: community_events
    display_name: "Local Events & Community"
    keywords:
      - "eureka days"
      - "brookdale farms"
      - "festival"
      - "event"
    rule: >
      Include notable community events — Eureka Days, events at Brookdale
      Farms, and similar named local happenings. This is a firm "want to
      know": treat named recurring community events as worth surfacing every
      time they're announced or scheduled, not just novel ones.

  - id: meramec_river
    display_name: "Meramec River Conditions"
    keywords:
      - "meramec"
      - "river level"
      - "float"
      - "gauge"
      - "flood stage"
      - "outfitter"
    rule: >
      Include river level/flow readings, float condition advisories,
      closures or safety warnings (e.g. after heavy rain), and outfitter
      announcements (opening/closing for season) for the Eureka stretch of
      the Meramec.

  - id: local_business
    display_name: "New or Closing Restaurants and Stores"
    keywords:
      - "eureka"
      - "opening"
      - "closing"
      - "closed"
      - "new restaurant"
      - "new store"
    rule: >
      Include openings/closings of restaurants, retail, or other commercial
      spots in Eureka specifically. Skip generic chain-wide corporate news
      unless it's about the local Eureka location.

  - id: golf_carts
    display_name: "Golf Cart Legality"
    keywords:
      - "golf cart"
      - "golf carts"
    rule: >
      Include anything about golf cart ordinances, legality, or enforcement
      — city, county, or state level — that would affect operating one in
      Eureka or unincorporated St. Louis County. This is a narrow, specific
      watch item; even a small local ordinance change here is relevant.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_relevance_config.py -v`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add eureka-news/src/eureka_news/relevance/__init__.py eureka-news/src/eureka_news/relevance/config.py eureka-news/config/relevance.yaml eureka-news/tests/fixtures/yaml/relevance_sample.yaml eureka-news/tests/test_relevance_config.py
git commit -m "feat: add relevance config loader and full 9-category profile"
```

---

### Task 13: Keyword pre-filter pass

**Files:**
- Create: `eureka-news/src/eureka_news/relevance/keyword_filter.py`
- Test: `eureka-news/tests/test_relevance_keyword_filter.py`

**Interfaces:**
- Consumes: `NormalizedItem` from `eureka_news.models`; `Category` from `eureka_news.relevance.config`
- Produces: `CategorizedItem(item: NormalizedItem, category: Category)` — frozen dataclass; `keyword_filter(items: list[NormalizedItem], categories: list[Category]) -> list[CategorizedItem]`. An item is assigned to the *first* category (in list order) whose keyword appears in its title+text; items matching no category's keywords are dropped.

- [ ] **Step 1: Write the failing test**

Create `eureka-news/tests/test_relevance_keyword_filter.py`:

```python
from datetime import date

from eureka_news.models import NormalizedItem
from eureka_news.relevance.config import Category
from eureka_news.relevance.keyword_filter import keyword_filter

GOVERNMENT = Category(
    id="government",
    display_name="Government",
    keywords=["board of aldermen", "tax"],
    rule="Include votes on taxes.",
)
GOLF_CARTS = Category(
    id="golf_carts",
    display_name="Golf Carts",
    keywords=["golf cart"],
    rule="Include golf cart ordinances.",
)


def _item(title, text=""):
    return NormalizedItem(source="s", url="u", title=title, text=text, published_date=date(2026, 8, 1))


def test_keyword_filter_matches_first_category_with_hit():
    items = [
        _item("Board of Aldermen approves new budget"),
        _item("City considers golf cart ordinance"),
        _item("Local sports team wins tournament"),
    ]
    result = keyword_filter(items, [GOVERNMENT, GOLF_CARTS])
    assert len(result) == 2
    assert result[0].category.id == "government"
    assert result[1].category.id == "golf_carts"


def test_keyword_filter_is_case_insensitive():
    items = [_item("GOLF CART rules updated")]
    result = keyword_filter(items, [GOVERNMENT, GOLF_CARTS])
    assert len(result) == 1
    assert result[0].category.id == "golf_carts"


def test_keyword_filter_drops_items_matching_no_category():
    items = [_item("Weather forecast for the weekend")]
    result = keyword_filter(items, [GOVERNMENT, GOLF_CARTS])
    assert result == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_relevance_keyword_filter.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'eureka_news.relevance.keyword_filter'`

- [ ] **Step 3: Implement keyword_filter.py**

Create `eureka-news/src/eureka_news/relevance/keyword_filter.py`:

```python
from dataclasses import dataclass

from eureka_news.models import NormalizedItem
from eureka_news.relevance.config import Category


@dataclass(frozen=True)
class CategorizedItem:
    item: NormalizedItem
    category: Category


def keyword_filter(items: list[NormalizedItem], categories: list[Category]) -> list[CategorizedItem]:
    results = []
    for item in items:
        haystack = f"{item.title} {item.text}".lower()
        for category in categories:
            if any(keyword.lower() in haystack for keyword in category.keywords):
                results.append(CategorizedItem(item=item, category=category))
                break
    return results
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_relevance_keyword_filter.py -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add eureka-news/src/eureka_news/relevance/keyword_filter.py eureka-news/tests/test_relevance_keyword_filter.py
git commit -m "feat: add keyword pre-filter for relevance categorization"
```

---

### Task 14: Optional LLM relevance pass

**Files:**
- Create: `eureka-news/src/eureka_news/relevance/llm_filter.py`
- Test: `eureka-news/tests/test_relevance_llm_filter.py`

**Interfaces:**
- Consumes: `CategorizedItem` from `eureka_news.relevance.keyword_filter`
- Produces: `llm_filter(categorized_items: list[CategorizedItem], client: Anthropic) -> list[CategorizedItem]`. No API-key/env-var handling here — the caller (Task 17's CLI) decides whether to call this at all based on `ANTHROPIC_API_KEY`, and passes an already-constructed client. This keeps the function trivially testable with a fake client.

- [ ] **Step 1: Write the failing test**

Create `eureka-news/tests/test_relevance_llm_filter.py`:

```python
from datetime import date
from unittest.mock import Mock

from eureka_news.models import NormalizedItem
from eureka_news.relevance.config import Category
from eureka_news.relevance.keyword_filter import CategorizedItem
from eureka_news.relevance.llm_filter import llm_filter

CATEGORY = Category(id="government", display_name="Government", keywords=["tax"], rule="Include tax votes.")


def _entry(title):
    item = NormalizedItem(source="s", url="u", title=title, text="", published_date=date(2026, 8, 1))
    return CategorizedItem(item=item, category=CATEGORY)


def _fake_client(answers):
    client = Mock()
    responses = iter(answers)

    def create(**kwargs):
        response = Mock()
        response.content = [Mock(text=next(responses))]
        return response

    client.messages.create.side_effect = create
    return client


def test_llm_filter_keeps_only_yes_answers():
    entries = [_entry("Council votes to raise property tax"), _entry("Council members pose for a photo")]
    client = _fake_client(["YES", "NO"])
    result = llm_filter(entries, client=client)
    assert len(result) == 1
    assert result[0].item.title == "Council votes to raise property tax"


def test_llm_filter_sends_category_rule_in_prompt():
    entries = [_entry("Council votes to raise property tax")]
    client = _fake_client(["YES"])
    llm_filter(entries, client=client)
    prompt = client.messages.create.call_args.kwargs["messages"][0]["content"]
    assert "Include tax votes." in prompt
    assert client.messages.create.call_args.kwargs["model"] == "claude-sonnet-5"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_relevance_llm_filter.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'eureka_news.relevance.llm_filter'`

- [ ] **Step 3: Implement llm_filter.py**

Create `eureka-news/src/eureka_news/relevance/llm_filter.py`:

```python
from anthropic import Anthropic

from eureka_news.relevance.keyword_filter import CategorizedItem

MODEL = "claude-sonnet-5"


def llm_filter(categorized_items: list[CategorizedItem], client: Anthropic) -> list[CategorizedItem]:
    return [entry for entry in categorized_items if _judge_relevant(client, entry)]


def _judge_relevant(client: Anthropic, entry: CategorizedItem) -> bool:
    prompt = (
        f"Category rule: {entry.category.rule}\n\n"
        f"Story title: {entry.item.title}\n"
        f"Story text: {entry.item.text}\n\n"
        "Does this story satisfy the category rule's inclusion criteria? "
        "Answer with exactly one word: YES or NO."
    )
    response = client.messages.create(
        model=MODEL,
        max_tokens=8,
        messages=[{"role": "user", "content": prompt}],
    )
    answer = response.content[0].text.strip().upper()
    return answer.startswith("YES")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_relevance_llm_filter.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add eureka-news/src/eureka_news/relevance/llm_filter.py eureka-news/tests/test_relevance_llm_filter.py
git commit -m "feat: add optional Claude-based relevance judgment pass"
```

---

### Task 15: Dedup

**Files:**
- Create: `eureka-news/src/eureka_news/dedup.py`
- Test: `eureka-news/tests/test_dedup.py`

**Interfaces:**
- Consumes: `CategorizedItem` from `eureka_news.relevance.keyword_filter`
- Produces: `dedup(categorized_items: list[CategorizedItem], threshold: int = 85) -> list[list[CategorizedItem]]` — clusters of same-story items (same category, same published date, fuzzy-similar title). Order of first appearance is preserved for both clusters and items within a cluster.

- [ ] **Step 1: Write the failing test**

Create `eureka-news/tests/test_dedup.py`:

```python
from datetime import date

from eureka_news.dedup import dedup
from eureka_news.models import NormalizedItem
from eureka_news.relevance.config import Category
from eureka_news.relevance.keyword_filter import CategorizedItem

GOVERNMENT = Category(id="government", display_name="Government", keywords=[], rule="")
SCHOOLS = Category(id="schools", display_name="Schools", keywords=[], rule="")


def _entry(source, title, category=GOVERNMENT, published=date(2026, 8, 10)):
    item = NormalizedItem(source=source, url=f"https://example.com/{source}", title=title, text="", published_date=published)
    return CategorizedItem(item=item, category=category)


def test_dedup_clusters_same_story_across_sources():
    entries = [
        _entry("FOX2", "Board of Aldermen approves new city budget"),
        _entry("KSDK", "Board of Aldermen approves new city budget"),
    ]
    clusters = dedup(entries)
    assert len(clusters) == 1
    assert len(clusters[0]) == 2


def test_dedup_keeps_different_stories_separate():
    entries = [
        _entry("FOX2", "Board of Aldermen approves new city budget"),
        _entry("KSDK", "Two-vehicle crash closes Highway 109"),
    ]
    clusters = dedup(entries)
    assert len(clusters) == 2


def test_dedup_keeps_same_title_in_different_categories_separate():
    entries = [
        _entry("FOX2", "District approves new funding", category=GOVERNMENT),
        _entry("KSDK", "District approves new funding", category=SCHOOLS),
    ]
    clusters = dedup(entries)
    assert len(clusters) == 2


def test_dedup_keeps_same_title_on_different_days_separate():
    entries = [
        _entry("FOX2", "Weekly county council update", published=date(2026, 8, 10)),
        _entry("KSDK", "Weekly county council update", published=date(2026, 8, 17)),
    ]
    clusters = dedup(entries)
    assert len(clusters) == 2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_dedup.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'eureka_news.dedup'`

- [ ] **Step 3: Implement dedup.py**

Create `eureka-news/src/eureka_news/dedup.py`:

```python
from rapidfuzz import fuzz

from eureka_news.relevance.keyword_filter import CategorizedItem

DEFAULT_THRESHOLD = 85


def dedup(categorized_items: list[CategorizedItem], threshold: int = DEFAULT_THRESHOLD) -> list[list[CategorizedItem]]:
    clusters: list[list[CategorizedItem]] = []
    for entry in categorized_items:
        placed = False
        for cluster in clusters:
            representative = cluster[0]
            if (
                representative.category.id == entry.category.id
                and representative.item.published_date == entry.item.published_date
                and fuzz.token_sort_ratio(representative.item.title, entry.item.title) >= threshold
            ):
                cluster.append(entry)
                placed = True
                break
        if not placed:
            clusters.append([entry])
    return clusters
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_dedup.py -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add eureka-news/src/eureka_news/dedup.py eureka-news/tests/test_dedup.py
git commit -m "feat: add fuzzy dedup for same-story multi-source coverage"
```

---

### Task 16: Summary generation

**Files:**
- Create: `eureka-news/src/eureka_news/summarize.py`
- Test: `eureka-news/tests/test_summarize.py`

**Interfaces:**
- Consumes: `CategorizedItem` (clusters, i.e. `list[list[CategorizedItem]]`) from `eureka_news.dedup`; `Category` from `eureka_news.relevance.config`
- Produces: `ClusterSummary(category: Category, primary_title: str, summary_text: str, source_links: list[tuple[str, str]])`; `summarize_cluster(cluster: list[CategorizedItem], client: Anthropic | None) -> ClusterSummary`; `render_markdown(cluster_summaries: list[ClusterSummary], categories: list[Category], llm_enabled: bool, since: date, until: date) -> str`

- [ ] **Step 1: Write the failing tests**

Create `eureka-news/tests/test_summarize.py`:

```python
from datetime import date
from unittest.mock import Mock

from eureka_news.models import NormalizedItem
from eureka_news.relevance.config import Category
from eureka_news.relevance.keyword_filter import CategorizedItem
from eureka_news.summarize import ClusterSummary, render_markdown, summarize_cluster

GOVERNMENT = Category(id="government", display_name="City/County Government", keywords=[], rule="")
SCHOOLS = Category(id="schools", display_name="Schools", keywords=[], rule="")


def _entry(source, title, text="Some body text about the story that is fairly long indeed."):
    item = NormalizedItem(source=source, url=f"https://example.com/{source}", title=title, text=text, published_date=date(2026, 8, 10))
    return CategorizedItem(item=item, category=GOVERNMENT)


def test_summarize_cluster_without_llm_falls_back_to_truncated_text():
    cluster = [_entry("FOX2", "Budget approved"), _entry("KSDK", "Budget approved")]
    summary = summarize_cluster(cluster, client=None)
    assert summary.primary_title == "Budget approved"
    assert summary.summary_text.startswith("Some body text")
    assert ("FOX2", "https://example.com/FOX2") in summary.source_links
    assert ("KSDK", "https://example.com/KSDK") in summary.source_links


def test_summarize_cluster_with_llm_uses_generated_text():
    cluster = [_entry("FOX2", "Budget approved")]
    client = Mock()
    response = Mock()
    response.content = [Mock(text="The city approved its annual budget.")]
    client.messages.create.return_value = response
    summary = summarize_cluster(cluster, client=client)
    assert summary.summary_text == "The city approved its annual budget."


def test_render_markdown_lists_every_category_and_marks_empty_ones():
    summaries = [
        ClusterSummary(
            category=GOVERNMENT,
            primary_title="Budget approved",
            summary_text="The city approved its budget.",
            source_links=[("FOX2", "https://example.com/FOX2")],
        )
    ]
    markdown = render_markdown(
        summaries,
        categories=[GOVERNMENT, SCHOOLS],
        llm_enabled=True,
        since=date(2026, 8, 10),
        until=date(2026, 8, 17),
    )
    assert "## City/County Government" in markdown
    assert "Budget approved" in markdown
    assert "## Schools" in markdown
    assert "_No relevant items this period._" in markdown


def test_render_markdown_notes_when_llm_not_applied():
    markdown = render_markdown([], categories=[GOVERNMENT], llm_enabled=False, since=date(2026, 8, 10), until=date(2026, 8, 17))
    assert "LLM refinement and summaries not applied" in markdown
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_summarize.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'eureka_news.summarize'`

- [ ] **Step 3: Implement summarize.py**

Create `eureka-news/src/eureka_news/summarize.py`:

```python
from dataclasses import dataclass
from datetime import date

from anthropic import Anthropic

from eureka_news.relevance.config import Category
from eureka_news.relevance.keyword_filter import CategorizedItem

MODEL = "claude-sonnet-5"
FALLBACK_SUMMARY_LENGTH = 280


@dataclass(frozen=True)
class ClusterSummary:
    category: Category
    primary_title: str
    summary_text: str
    source_links: list[tuple[str, str]]


def summarize_cluster(cluster: list[CategorizedItem], client: Anthropic | None) -> ClusterSummary:
    primary = cluster[0].item
    source_links = [(entry.item.source, entry.item.url) for entry in cluster]
    if client is not None:
        summary_text = _llm_summarize(client, cluster)
    else:
        summary_text = primary.text[:FALLBACK_SUMMARY_LENGTH]
    return ClusterSummary(
        category=cluster[0].category,
        primary_title=primary.title,
        summary_text=summary_text,
        source_links=source_links,
    )


def _llm_summarize(client: Anthropic, cluster: list[CategorizedItem]) -> str:
    combined = "\n\n".join(
        f"Source: {entry.item.source}\nTitle: {entry.item.title}\nText: {entry.item.text}" for entry in cluster
    )
    prompt = (
        "Write a 1-3 sentence neutral summary of this local news story for a "
        f"resident of Eureka, MO:\n\n{combined}"
    )
    response = client.messages.create(model=MODEL, max_tokens=200, messages=[{"role": "user", "content": prompt}])
    return response.content[0].text.strip()


def render_markdown(
    cluster_summaries: list[ClusterSummary],
    categories: list[Category],
    llm_enabled: bool,
    since: date,
    until: date,
) -> str:
    lines = [f"# Eureka, MO Local News Summary ({since.isoformat()} to {until.isoformat()})", ""]
    if not llm_enabled:
        lines.append("_LLM refinement and summaries not applied for this run (no ANTHROPIC_API_KEY set)._")
        lines.append("")

    by_category: dict[str, list[ClusterSummary]] = {category.id: [] for category in categories}
    for summary in cluster_summaries:
        by_category[summary.category.id].append(summary)

    for category in categories:
        lines.append(f"## {category.display_name}")
        lines.append("")
        entries = by_category[category.id]
        if not entries:
            lines.append("_No relevant items this period._")
            lines.append("")
            continue
        for summary in entries:
            links = ", ".join(f"[{name}]({url})" for name, url in summary.source_links)
            lines.append(f"- **{summary.primary_title}** — {summary.summary_text} ({links})")
        lines.append("")

    return "\n".join(lines)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_summarize.py -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add eureka-news/src/eureka_news/summarize.py eureka-news/tests/test_summarize.py
git commit -m "feat: add cluster summarization and Markdown rendering"
```

---

### Task 17: CLI wiring and end-to-end test

**Files:**
- Create: `eureka-news/src/eureka_news/cli.py`
- Test: `eureka-news/tests/test_cli.py`

**Interfaces:**
- Consumes: everything from Tasks 1-16 (`parse_window`, `fetch_all`, `load_rss_adapters`, `UsgsAdapter`, `NwsAdapter`, `CountyCouncilAdapter`, `RockwoodAdapter`, `BrookdaleAdapter`, `ChamberAdapter`, `WestNewsAdapter`, `load_categories`, `keyword_filter`, `llm_filter`, `dedup`, `summarize_cluster`, `render_markdown`)
- Produces: `main(argv: list[str] | None = None) -> int` — the `eureka-news` console-script entry point.

- [ ] **Step 1: Write the failing test**

Create `eureka-news/tests/test_cli.py`:

```python
from datetime import date
from unittest.mock import patch

from eureka_news.cli import main
from eureka_news.models import NormalizedItem


def _fake_build_adapters():
    class FakeAdapter:
        name = "Fake Source"

        def fetch(self, since, until):
            return [
                NormalizedItem(
                    source=self.name,
                    url="https://example.com/story",
                    title="Board of Aldermen approves new budget",
                    text="The Eureka Board of Aldermen approved the annual budget on a 5-1 vote.",
                    published_date=date(2026, 8, 12),
                )
            ]

    return [FakeAdapter()]


def test_main_prints_markdown_with_no_api_key(capsys, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    with patch("eureka_news.cli.build_adapters", side_effect=_fake_build_adapters):
        exit_code = main(["--from", "2026-08-10", "--to", "2026-08-17"])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "# Eureka, MO Local News Summary" in captured.out
    assert "Board of Aldermen approves new budget" in captured.out
    assert "## Golf Cart Legality" in captured.out
    assert "_No relevant items this period._" in captured.out
    assert "LLM refinement and summaries not applied" in captured.out


def test_main_returns_nonzero_on_bad_arguments(capsys):
    with patch("eureka_news.cli.build_adapters", side_effect=_fake_build_adapters):
        exit_code = main(["--since", "not-a-window"])
    assert exit_code != 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_cli.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'eureka_news.cli'`

- [ ] **Step 3: Implement cli.py**

Create `eureka-news/src/eureka_news/cli.py`:

```python
import argparse
import os
import sys
from datetime import date
from pathlib import Path

from anthropic import Anthropic

from eureka_news.adapters.brookdale import BrookdaleAdapter
from eureka_news.adapters.chamber import ChamberAdapter
from eureka_news.adapters.county_council import CountyCouncilAdapter
from eureka_news.adapters.nws import NwsAdapter
from eureka_news.adapters.registry import fetch_all
from eureka_news.adapters.rockwood import RockwoodAdapter
from eureka_news.adapters.rss_config import load_rss_adapters
from eureka_news.adapters.usgs import UsgsAdapter
from eureka_news.adapters.west_news import WestNewsAdapter
from eureka_news.dedup import dedup
from eureka_news.relevance.config import load_categories
from eureka_news.relevance.keyword_filter import keyword_filter
from eureka_news.relevance.llm_filter import llm_filter
from eureka_news.summarize import render_markdown, summarize_cluster
from eureka_news.window import parse_window

CONFIG_DIR = Path(__file__).resolve().parent.parent.parent / "config"


def build_adapters():
    adapters = load_rss_adapters(CONFIG_DIR / "sources.yaml")
    adapters += [
        UsgsAdapter(),
        NwsAdapter(),
        CountyCouncilAdapter(),
        RockwoodAdapter(),
        BrookdaleAdapter(),
        ChamberAdapter(),
        WestNewsAdapter(),
    ]
    return adapters


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="eureka-news")
    parser.add_argument("--since", help='Look back this many days, e.g. "7d" (default: 7d)')
    parser.add_argument("--from", dest="from_date", help="Start date, YYYY-MM-DD (use with --to)")
    parser.add_argument("--to", dest="to_date", help="End date, YYYY-MM-DD (use with --from)")
    args = parser.parse_args(argv)

    try:
        since, until = parse_window(args.since, args.from_date, args.to_date, today=date.today())
    except ValueError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    raw_items = fetch_all(build_adapters(), since, until)
    categories = load_categories(CONFIG_DIR / "relevance.yaml")
    categorized = keyword_filter(raw_items, categories)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    client = Anthropic(api_key=api_key) if api_key else None
    if client is not None:
        categorized = llm_filter(categorized, client=client)

    clusters = dedup(categorized)
    cluster_summaries = [summarize_cluster(cluster, client) for cluster in clusters]

    markdown = render_markdown(
        cluster_summaries,
        categories,
        llm_enabled=client is not None,
        since=since,
        until=until,
    )
    print(markdown)
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_cli.py -v`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the full test suite**

Run: `uv run pytest -v -m "not playwright"`
Expected: PASS (all tests except the Playwright-marked Chamber test)

Run: `uv run pytest -v -m playwright`
Expected: PASS (1 test) — requires `uv run playwright install chromium` to have been run (Task 10, Step 2)

- [ ] **Step 6: Commit**

```bash
git add eureka-news/src/eureka_news/cli.py eureka-news/tests/test_cli.py
git commit -m "feat: wire CLI entry point through full pipeline"
```

---

### Task 18: README and live smoke test

**Files:**
- Create: `eureka-news/README.md`

**Interfaces:**
- None (documentation-only task).

- [ ] **Step 1: Write the README**

Create `eureka-news/README.md`:

```markdown
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
```

- [ ] **Step 2: Run a manual live smoke test**

Run: `cd eureka-news && ANTHROPIC_API_KEY= uv run eureka-news --since 7d`

Confirm: the command completes without crashing, prints all 9 category
headers, and any adapter that fails against the live site logs a warning
(via Python's `logging`, visible on stderr) rather than raising. Spot-check
the County Council, Rockwood, Brookdale, and Chamber output against the
actual live pages — these are the adapters whose selectors could not be
verified end-to-end during planning (see the implementation notes on Tasks
7, 8, 9, and 10) and are the ones most likely to need a selector fix here.

If `ANTHROPIC_API_KEY` is available, also run once with it set to confirm the
LLM pass and generated summaries work end-to-end against real data.

- [ ] **Step 3: Commit**

```bash
git add eureka-news/README.md
git commit -m "docs: add README with setup, usage, and known limitations"
```

---

## Self-Review Notes

**Spec coverage:** All 9 relevance categories are encoded in `config/relevance.yaml` (Task 12). All 5 clean-feed/API sources (Task 4 RSS group, Task 5 USGS, Task 6 NWS) and all 4 scrape-required sources (Tasks 7-10) are implemented, plus West News Magazine (Task 11) with the honest-User-Agent decision. Time window + agenda lookahead (Task 2), fail-isolated registry (Task 3), two-pass relevance filter (Tasks 13-14), dedup (Task 15), summary generation with always-shown categories (Task 16), and CLI (Task 17) all map directly to spec sections. Known coverage gaps (categories 4/5/9, County Council PDF parsing, DESE ratings) are documented in the README rather than silently unhandled.

**Placeholder scan:** No TBD/TODO markers. Two adapters (Rockwood's date selector, Chamber's Wix selectors) carry explicit "verify against live site" notes because their exact markup could not be confirmed without either guessing or running a live headless browser during planning — each still ships a complete, tested implementation against a self-consistent fixture, with the live-verification step made concrete in Task 18 rather than left vague.

**Type consistency:** `NormalizedItem` (Task 1) is consumed identically by every adapter. `Category` (Task 12) and `CategorizedItem` (Task 13) flow unchanged through `llm_filter` (Task 14), `dedup` (Task 15), and `summarize`/`render_markdown` (Task 16) into `cli.py` (Task 17) — verified the field names (`category.rule`, `item.published_date`, `summary.source_links`, etc.) match at each consumption point.
