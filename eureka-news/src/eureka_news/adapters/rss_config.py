from pathlib import Path

import yaml

from eureka_news.adapters.rss import RssAdapter


def load_rss_adapters(config_path: Path) -> list[RssAdapter]:
    data = yaml.safe_load(config_path.read_text())
    return [
        RssAdapter(
            name=entry["name"],
            feed_url=entry["url"],
            category_hint=entry.get("category_hint"),
        )
        for entry in data.get("rss_sources", [])
    ]
