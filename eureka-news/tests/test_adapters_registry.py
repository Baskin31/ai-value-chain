from datetime import date
from eureka_news.adapters.registry import fetch_all
from eureka_news.models import NormalizedItem


class WorkingAdapter:
    name = "Working"

    def fetch(self, since, until):
        return [NormalizedItem(source=self.name, url="u", title="t", text="", published_date=since)]


class BrokenAdapter:
    name = "Broken"

    def fetch(self, since, until):
        raise RuntimeError("simulated network failure")


def test_fetch_all_isolates_failures_and_keeps_working_results():
    since, until = date(2026, 8, 1), date(2026, 8, 17)
    items = fetch_all([WorkingAdapter(), BrokenAdapter()], since, until)
    assert len(items) == 1
    assert items[0].source == "Working"


def test_fetch_all_returns_empty_list_when_all_adapters_fail():
    items = fetch_all([BrokenAdapter()], date(2026, 8, 1), date(2026, 8, 17))
    assert items == []
