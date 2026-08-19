from pathlib import Path
from eureka_news.relevance.config import load_categories

FIXTURE = Path(__file__).parent / "fixtures" / "yaml" / "relevance_sample.yaml"


def test_load_categories_preserves_order_and_fields():
    categories = load_categories(FIXTURE)
    assert [c.id for c in categories] == ["government", "golf_carts"]
    assert categories[0].display_name == "City/County Government & Elections"
    assert "board of aldermen" in categories[0].keywords
    assert categories[0].rule.strip().startswith("Include votes or decisions")
