import json
import logging
import re
from datetime import date, datetime

import requests
from bs4 import BeautifulSoup

from eureka_news.models import NormalizedItem

logger = logging.getLogger(__name__)

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
        try:
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
        except Exception:
            logger.warning("Failed to fetch event from %s", url, exc_info=True)
            return None


def _parse_date(raw: str) -> date | None:
    try:
        return datetime.fromisoformat(raw).date()
    except ValueError:
        return None
