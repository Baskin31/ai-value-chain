import json
from datetime import date
from pathlib import Path
from unittest.mock import Mock, patch

from eureka_news.adapters.nws import NwsAdapter

FIXTURE = Path(__file__).parent / "fixtures" / "json" / "nws_sample.json"


def test_nws_adapter_reports_observed_stage_and_no_flooding(monkeypatch):
    monkeypatch.setattr("eureka_news.adapters.nws.date", _FixedDate)
    adapter = NwsAdapter()
    fake_response = Mock()
    fake_response.json.return_value = json.loads(FIXTURE.read_text())
    fake_response.raise_for_status = Mock()

    with patch("eureka_news.adapters.nws.requests.get", return_value=fake_response):
        items = adapter.fetch(since=date(2026, 8, 10), until=date(2026, 8, 31))

    assert len(items) == 1
    assert "no flooding" in items[0].title
    assert "3.45" in items[0].text
    assert "Forecast" not in items[0].text  # -999 sentinel must be suppressed


def test_nws_adapter_includes_forecast_when_present(monkeypatch):
    monkeypatch.setattr("eureka_news.adapters.nws.date", _FixedDate)
    adapter = NwsAdapter()
    data = json.loads(FIXTURE.read_text())
    data["status"]["forecast"]["primary"] = 18.5
    data["status"]["forecast"]["floodCategory"] = "action"
    fake_response = Mock()
    fake_response.json.return_value = data
    fake_response.raise_for_status = Mock()

    with patch("eureka_news.adapters.nws.requests.get", return_value=fake_response):
        items = adapter.fetch(since=date(2026, 8, 10), until=date(2026, 8, 31))

    assert "Forecast stage: 18.5" in items[0].text


class _FixedDate(date):
    @classmethod
    def today(cls):
        return date(2026, 8, 17)
