from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class NormalizedItem:
    source: str
    url: str
    title: str
    text: str
    published_date: date
    category_hint: str | None = None
