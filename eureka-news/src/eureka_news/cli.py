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

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

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
