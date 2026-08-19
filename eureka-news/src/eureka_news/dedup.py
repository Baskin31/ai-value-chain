from rapidfuzz import fuzz

from eureka_news.relevance.keyword_filter import CategorizedItem

DEFAULT_THRESHOLD = 85


def dedup(categorized_items: list[CategorizedItem], threshold: int = DEFAULT_THRESHOLD) -> list[list[CategorizedItem]]:
    clusters: list[list[CategorizedItem]] = []
    for entry in categorized_items:
        placed = False
        for cluster in clusters:
            representative = cluster[0]
            if (
                representative.category.id == entry.category.id
                and representative.item.published_date == entry.item.published_date
                and fuzz.token_sort_ratio(representative.item.title, entry.item.title) >= threshold
            ):
                cluster.append(entry)
                placed = True
                break
        if not placed:
            clusters.append([entry])
    return clusters
