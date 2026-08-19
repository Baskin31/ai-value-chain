from pathlib import Path
from eureka_news.adapters.rss_config import load_rss_adapters

FIXTURE = Path(__file__).parent / "fixtures" / "yaml" / "sources_sample.yaml"


def test_load_rss_adapters_builds_adapter_per_entry():
    adapters = load_rss_adapters(FIXTURE)
    assert len(adapters) == 2
    assert adapters[0].name == "Sample Source A"
    assert adapters[0].feed_url == "https://example.com/a.xml"
    assert adapters[0].category_hint == "government"
    assert adapters[1].category_hint is None
