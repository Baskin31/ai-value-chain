from datetime import date
from unittest.mock import patch

from eureka_news.cli import main
from eureka_news.models import NormalizedItem


def _fake_build_adapters():
    class FakeAdapter:
        name = "Fake Source"

        def fetch(self, since, until):
            return [
                NormalizedItem(
                    source=self.name,
                    url="https://example.com/story",
                    title="Board of Aldermen approves new budget",
                    text="The Eureka Board of Aldermen approved the annual budget on a 5-1 vote.",
                    published_date=date(2026, 8, 12),
                )
            ]

    return [FakeAdapter()]


def test_main_prints_markdown_with_no_api_key(capsys, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    with patch("eureka_news.cli.build_adapters", side_effect=_fake_build_adapters):
        exit_code = main(["--from", "2026-08-10", "--to", "2026-08-17"])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "# Eureka, MO Local News Summary" in captured.out
    assert "Board of Aldermen approves new budget" in captured.out
    assert "## Golf Cart Legality" in captured.out
    assert "_No relevant items this period._" in captured.out
    assert "LLM refinement and summaries not applied" in captured.out


def test_main_returns_nonzero_on_bad_arguments(capsys):
    with patch("eureka_news.cli.build_adapters", side_effect=_fake_build_adapters):
        exit_code = main(["--since", "not-a-window"])
    assert exit_code != 0
