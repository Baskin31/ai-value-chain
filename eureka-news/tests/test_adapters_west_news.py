from datetime import date
from pathlib import Path
from unittest.mock import Mock, patch

from eureka_news.adapters.west_news import USER_AGENT, WestNewsAdapter

FIXTURE = Path(__file__).parent / "fixtures" / "sitemap" / "west_news_sitemap.xml"


def test_west_news_adapter_keeps_only_locally_relevant_entries_in_window():
    adapter = WestNewsAdapter()
    fake_response = Mock()
    fake_response.content = FIXTURE.read_bytes()
    fake_response.raise_for_status = Mock()

    with patch("eureka_news.adapters.west_news.requests.get", return_value=fake_response) as mock_get:
        items = adapter.fetch(since=date(2026, 8, 1), until=date(2026, 8, 31))

    assert mock_get.call_args.kwargs["headers"]["User-Agent"] == USER_AGENT
    assert "ClaudeBot" not in USER_AGENT and "Mozilla" not in USER_AGENT
    titles = {item.title for item in items}
    assert "New cafe opens in downtown Eureka" in titles
    assert "CBC names Mike Seppi as new vice president and chief operating officer" in titles
    assert "Chesterfield team wins regional title" not in titles


def test_west_news_adapter_respects_date_window():
    adapter = WestNewsAdapter()
    fake_response = Mock()
    fake_response.content = FIXTURE.read_bytes()
    fake_response.raise_for_status = Mock()

    with patch("eureka_news.adapters.west_news.requests.get", return_value=fake_response):
        items = adapter.fetch(since=date(2026, 8, 16), until=date(2026, 8, 31))

    titles = {item.title for item in items}
    assert "New cafe opens in downtown Eureka" not in titles  # published 8/15, outside window
