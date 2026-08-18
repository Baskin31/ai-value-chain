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
