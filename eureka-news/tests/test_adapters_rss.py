from datetime import date
from pathlib import Path
from unittest.mock import Mock, patch

from eureka_news.adapters.rss import RssAdapter

FIXTURE = Path(__file__).parent / "fixtures" / "rss" / "sample_feed.xml"


def test_rss_adapter_filters_by_window_and_normalizes_fields():
    adapter = RssAdapter(name="Sample Feed", feed_url="https://example.com/feed.xml", category_hint="government")
    fake_response = Mock()
    fake_response.content = FIXTURE.read_bytes()
    fake_response.raise_for_status = Mock()

    with patch("eureka_news.adapters.rss.requests.get", return_value=fake_response) as mock_get:
        items = adapter.fetch(since=date(2026, 8, 1), until=date(2026, 8, 17))

    mock_get.assert_called_once()
    assert mock_get.call_args.kwargs["headers"]["User-Agent"] == "EurekaNewsAggregator/1.0"
    assert len(items) == 1
    assert items[0].title == "Board of Aldermen approves new budget"
    assert items[0].url == "https://example.com/article-1"
    assert items[0].published_date == date(2026, 8, 10)
    assert items[0].source == "Sample Feed"
    assert items[0].category_hint == "government"


def test_rss_adapter_raises_on_http_error():
    adapter = RssAdapter(name="Sample Feed", feed_url="https://example.com/feed.xml")
    fake_response = Mock()
    fake_response.raise_for_status.side_effect = RuntimeError("HTTP 500")

    with patch("eureka_news.adapters.rss.requests.get", return_value=fake_response):
        try:
            adapter.fetch(since=date(2026, 8, 1), until=date(2026, 8, 17))
            assert False, "expected RuntimeError to propagate"
        except RuntimeError:
            pass
