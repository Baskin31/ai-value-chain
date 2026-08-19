from dataclasses import dataclass
from pathlib import Path

import yaml


@dataclass(frozen=True)
class Category:
    id: str
    display_name: str
    keywords: list[str]
    rule: str


def load_categories(config_path: Path) -> list[Category]:
    data = yaml.safe_load(config_path.read_text())
    return [
        Category(
            id=entry["id"],
            display_name=entry["display_name"],
            keywords=entry.get("keywords", []),
            rule=entry["rule"].strip(),
        )
        for entry in data["categories"]
    ]
