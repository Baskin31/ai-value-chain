from datetime import date
from eureka_news.models import NormalizedItem


def test_normalized_item_holds_fields():
    item = NormalizedItem(
        source="Test Source",
        url="https://example.com/a",
        title="Title",
        text="Body text",
        published_date=date(2026, 8, 1),
        category_hint="government",
    )
    assert item.source == "Test Source"
    assert item.published_date == date(2026, 8, 1)
    assert item.category_hint == "government"


def test_normalized_item_category_hint_defaults_to_none():
    item = NormalizedItem(
        source="Test Source",
        url="https://example.com/a",
        title="Title",
        text="Body text",
        published_date=date(2026, 8, 1),
    )
    assert item.category_hint is None
