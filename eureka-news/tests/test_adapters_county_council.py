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
