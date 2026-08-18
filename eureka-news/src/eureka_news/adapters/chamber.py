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
