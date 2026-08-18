import json
from datetime import date
from pathlib import Path
from unittest.mock import Mock, patch

from eureka_news.adapters.usgs import UsgsAdapter

FIXTURE = Path(__file__).parent / "fixtures" / "json" / "usgs_sample.json"


def test_usgs_adapter_returns_current_reading_when_window_includes_today(monkeypatch):
    monkeypatch.setattr("eureka_news.adapters.usgs.date", _FixedDate)
    adapter = UsgsAdapter()
    fake_response = Mock()
    fake_response.json.return_value = json.loads(FIXTURE.read_text())
    fake_response.raise_for_status = Mock()

    with patch("eureka_news.adapters.usgs.requests.get", return_value=fake_response):
        items = adapter.fetch(since=date(2026, 8, 10), until=date(2026, 8, 31))

    assert len(items) == 1
    assert items[0].published_date == date(2026, 8, 17)
    assert "450" in items[0].text
    assert "3.2" in items[0].text


def test_usgs_adapter_returns_nothing_when_window_excludes_today(monkeypatch):
    monkeypatch.setattr("eureka_news.adapters.usgs.date", _FixedDate)
    adapter = UsgsAdapter()
    with patch("eureka_news.adapters.usgs.requests.get") as mock_get:
        items = adapter.fetch(since=date(2020, 1, 1), until=date(2020, 1, 31))
    mock_get.assert_not_called()
    assert items == []


class _FixedDate(date):
    @classmethod
    def today(cls):
        return date(2026, 8, 17)
