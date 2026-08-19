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
