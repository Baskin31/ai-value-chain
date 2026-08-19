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
            link = article.select_one("a.fsPostLink:not(.fsThumbnail)[href]")
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
