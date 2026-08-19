from datetime import date

from eureka_news.dedup import dedup
from eureka_news.models import NormalizedItem
from eureka_news.relevance.config import Category
from eureka_news.relevance.keyword_filter import CategorizedItem

GOVERNMENT = Category(id="government", display_name="Government", keywords=[], rule="")
SCHOOLS = Category(id="schools", display_name="Schools", keywords=[], rule="")


def _entry(source, title, category=GOVERNMENT, published=date(2026, 8, 10)):
    item = NormalizedItem(source=source, url=f"https://example.com/{source}", title=title, text="", published_date=published)
    return CategorizedItem(item=item, category=category)


def test_dedup_clusters_same_story_across_sources():
    entries = [
        _entry("FOX2", "Board of Aldermen approves new city budget"),
        _entry("KSDK", "Board of Aldermen approves new city budget"),
    ]
    clusters = dedup(entries)
    assert len(clusters) == 1
    assert len(clusters[0]) == 2


def test_dedup_keeps_different_stories_separate():
    entries = [
        _entry("FOX2", "Board of Aldermen approves new city budget"),
        _entry("KSDK", "Two-vehicle crash closes Highway 109"),
    ]
    clusters = dedup(entries)
    assert len(clusters) == 2


def test_dedup_keeps_same_title_in_different_categories_separate():
    entries = [
        _entry("FOX2", "District approves new funding", category=GOVERNMENT),
        _entry("KSDK", "District approves new funding", category=SCHOOLS),
    ]
    clusters = dedup(entries)
    assert len(clusters) == 2


def test_dedup_keeps_same_title_on_different_days_separate():
    entries = [
        _entry("FOX2", "Weekly county council update", published=date(2026, 8, 10)),
        _entry("KSDK", "Weekly county council update", published=date(2026, 8, 17)),
    ]
    clusters = dedup(entries)
    assert len(clusters) == 2
