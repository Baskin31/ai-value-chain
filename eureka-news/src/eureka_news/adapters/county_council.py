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
