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
