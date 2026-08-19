from dataclasses import dataclass

from eureka_news.models import NormalizedItem
from eureka_news.relevance.config import Category


@dataclass(frozen=True)
class CategorizedItem:
    item: NormalizedItem
    category: Category


def keyword_filter(items: list[NormalizedItem], categories: list[Category]) -> list[CategorizedItem]:
    results = []
    for item in items:
        haystack = f"{item.title} {item.text}".lower()
        for category in categories:
            if any(keyword.lower() in haystack for keyword in category.keywords):
                results.append(CategorizedItem(item=item, category=category))
                break
    return results
