from datetime import date

from eureka_news.models import NormalizedItem
from eureka_news.relevance.config import Category
from eureka_news.relevance.keyword_filter import keyword_filter

GOVERNMENT = Category(
    id="government",
    display_name="Government",
    keywords=["board of aldermen", "tax"],
    rule="Include votes on taxes.",
)
GOLF_CARTS = Category(
    id="golf_carts",
    display_name="Golf Carts",
    keywords=["golf cart"],
    rule="Include golf cart ordinances.",
)


def _item(title, text=""):
    return NormalizedItem(source="s", url="u", title=title, text=text, published_date=date(2026, 8, 1))


def test_keyword_filter_matches_first_category_with_hit():
    items = [
        _item("Board of Aldermen approves new budget"),
        _item("City considers golf cart ordinance"),
        _item("Local sports team wins tournament"),
    ]
    result = keyword_filter(items, [GOVERNMENT, GOLF_CARTS])
    assert len(result) == 2
    assert result[0].category.id == "government"
    assert result[1].category.id == "golf_carts"


def test_keyword_filter_is_case_insensitive():
    items = [_item("GOLF CART rules updated")]
    result = keyword_filter(items, [GOVERNMENT, GOLF_CARTS])
    assert len(result) == 1
    assert result[0].category.id == "golf_carts"


def test_keyword_filter_drops_items_matching_no_category():
    items = [_item("Weather forecast for the weekend")]
    result = keyword_filter(items, [GOVERNMENT, GOLF_CARTS])
    assert result == []
