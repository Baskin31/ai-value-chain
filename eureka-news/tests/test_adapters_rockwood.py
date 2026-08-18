from datetime import date
from pathlib import Path
from unittest.mock import Mock, patch

from eureka_news.adapters.rockwood import RockwoodAdapter

FIXTURE = Path(__file__).parent / "fixtures" / "html" / "rockwood_news.html"


def test_rockwood_adapter_parses_articles_in_window():
    adapter = RockwoodAdapter()
    fake_response = Mock()
    fake_response.text = FIXTURE.read_text()
    fake_response.raise_for_status = Mock()

    with patch("eureka_news.adapters.rockwood.requests.get", return_value=fake_response):
        items = adapter.fetch(since=date(2026, 8, 1), until=date(2026, 8, 31))

    assert len(items) == 1
    assert "Back-to-School Guide" in items[0].title
    assert items[0].published_date == date(2026, 8, 10)
    assert items[0].url == "https://www.rsdmo.org/news/article/~board/rsd/post/the-rockwood-school-district-back-to-school-guide-2026-2027"
    assert items[0].category_hint == "schools"
