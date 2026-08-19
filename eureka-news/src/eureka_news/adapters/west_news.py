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
