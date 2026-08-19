from datetime import date
from unittest.mock import Mock

from eureka_news.models import NormalizedItem
from eureka_news.relevance.config import Category
from eureka_news.relevance.keyword_filter import CategorizedItem
from eureka_news.summarize import ClusterSummary, render_markdown, summarize_cluster

GOVERNMENT = Category(id="government", display_name="City/County Government", keywords=[], rule="")
SCHOOLS = Category(id="schools", display_name="Schools", keywords=[], rule="")


def _entry(source, title, text="Some body text about the story that is fairly long indeed."):
    item = NormalizedItem(source=source, url=f"https://example.com/{source}", title=title, text=text, published_date=date(2026, 8, 10))
    return CategorizedItem(item=item, category=GOVERNMENT)


def test_summarize_cluster_without_llm_falls_back_to_truncated_text():
    cluster = [_entry("FOX2", "Budget approved"), _entry("KSDK", "Budget approved")]
    summary = summarize_cluster(cluster, client=None)
    assert summary.primary_title == "Budget approved"
    assert summary.summary_text.startswith("Some body text")
    assert ("FOX2", "https://example.com/FOX2") in summary.source_links
    assert ("KSDK", "https://example.com/KSDK") in summary.source_links


def test_summarize_cluster_with_llm_uses_generated_text():
    cluster = [_entry("FOX2", "Budget approved")]
    client = Mock()
    response = Mock()
    response.content = [Mock(type="text", text="The city approved its annual budget.")]
    client.messages.create.return_value = response
    summary = summarize_cluster(cluster, client=client)
    assert summary.summary_text == "The city approved its annual budget."


def test_summarize_cluster_skips_leading_thinking_block_to_find_text():
    cluster = [_entry("FOX2", "Budget approved")]
    client = Mock()
    response = Mock()
    response.content = [
        Mock(type="thinking", text=None),
        Mock(type="text", text="The city approved its annual budget."),
    ]
    client.messages.create.return_value = response
    summary = summarize_cluster(cluster, client=client)
    assert summary.summary_text == "The city approved its annual budget."


def test_summarize_cluster_with_llm_failure_falls_back_to_truncated_text():
    long_text = "x" * 500
    cluster = [_entry("FOX2", "Budget approved", text=long_text)]
    client = Mock()
    client.messages.create.side_effect = RuntimeError("API error")
    summary = summarize_cluster(cluster, client=client)
    assert summary.primary_title == "Budget approved"
    assert summary.summary_text == long_text[:280]
    assert len(summary.summary_text) == 280


def test_render_markdown_lists_every_category_and_marks_empty_ones():
    summaries = [
        ClusterSummary(
            category=GOVERNMENT,
            primary_title="Budget approved",
            summary_text="The city approved its budget.",
            source_links=[("FOX2", "https://example.com/FOX2")],
        )
    ]
    markdown = render_markdown(
        summaries,
        categories=[GOVERNMENT, SCHOOLS],
        llm_enabled=True,
        since=date(2026, 8, 10),
        until=date(2026, 8, 17),
    )
    assert "## City/County Government" in markdown
    assert "Budget approved" in markdown
    assert "## Schools" in markdown
    assert "_No relevant items this period._" in markdown


def test_render_markdown_notes_when_llm_not_applied():
    markdown = render_markdown([], categories=[GOVERNMENT], llm_enabled=False, since=date(2026, 8, 10), until=date(2026, 8, 17))
    assert "LLM refinement and summaries not applied" in markdown
