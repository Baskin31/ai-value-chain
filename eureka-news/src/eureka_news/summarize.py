from dataclasses import dataclass
from datetime import date

from anthropic import Anthropic

from eureka_news.relevance.config import Category
from eureka_news.relevance.keyword_filter import CategorizedItem

MODEL = "claude-sonnet-5"
FALLBACK_SUMMARY_LENGTH = 280


@dataclass(frozen=True)
class ClusterSummary:
    category: Category
    primary_title: str
    summary_text: str
    source_links: list[tuple[str, str]]


def summarize_cluster(cluster: list[CategorizedItem], client: Anthropic | None) -> ClusterSummary:
    primary = cluster[0].item
    source_links = [(entry.item.source, entry.item.url) for entry in cluster]
    if client is not None:
        summary_text = _llm_summarize(client, cluster)
    else:
        summary_text = primary.text[:FALLBACK_SUMMARY_LENGTH]
    return ClusterSummary(
        category=cluster[0].category,
        primary_title=primary.title,
        summary_text=summary_text,
        source_links=source_links,
    )


def _llm_summarize(client: Anthropic, cluster: list[CategorizedItem]) -> str:
    combined = "\n\n".join(
        f"Source: {entry.item.source}\nTitle: {entry.item.title}\nText: {entry.item.text}" for entry in cluster
    )
    prompt = (
        "Write a 1-3 sentence neutral summary of this local news story for a "
        f"resident of Eureka, MO:\n\n{combined}"
    )
    response = client.messages.create(model=MODEL, max_tokens=200, messages=[{"role": "user", "content": prompt}])
    return response.content[0].text.strip()


def render_markdown(
    cluster_summaries: list[ClusterSummary],
    categories: list[Category],
    llm_enabled: bool,
    since: date,
    until: date,
) -> str:
    lines = [f"# Eureka, MO Local News Summary ({since.isoformat()} to {until.isoformat()})", ""]
    if not llm_enabled:
        lines.append("_LLM refinement and summaries not applied for this run (no ANTHROPIC_API_KEY set)._")
        lines.append("")

    by_category: dict[str, list[ClusterSummary]] = {category.id: [] for category in categories}
    for summary in cluster_summaries:
        by_category[summary.category.id].append(summary)

    for category in categories:
        lines.append(f"## {category.display_name}")
        lines.append("")
        entries = by_category[category.id]
        if not entries:
            lines.append("_No relevant items this period._")
            lines.append("")
            continue
        for summary in entries:
            links = ", ".join(f"[{name}]({url})" for name, url in summary.source_links)
            lines.append(f"- **{summary.primary_title}** — {summary.summary_text} ({links})")
        lines.append("")

    return "\n".join(lines)
