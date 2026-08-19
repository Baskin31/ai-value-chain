from datetime import date
import pytest
from eureka_news.window import parse_window, filter_by_window
from eureka_news.models import NormalizedItem


TODAY = date(2026, 8, 17)


def test_default_window_is_last_7_days_extended_forward():
    since, until = parse_window(None, None, None, today=TODAY)
    assert since == date(2026, 8, 10)
    assert until == date(2026, 8, 31)  # today + 14 day agenda lookahead


def test_since_days_format():
    since, until = parse_window("3d", None, None, today=TODAY)
    assert since == date(2026, 8, 14)
    assert until == date(2026, 8, 31)


def test_explicit_from_to_in_the_past_is_not_extended():
    since, until = parse_window(None, "2026-01-01", "2026-01-31", today=TODAY)
    assert since == date(2026, 1, 1)
    assert until == date(2026, 1, 31)


def test_explicit_from_to_reaching_today_is_extended():
    since, until = parse_window(None, "2026-08-01", "2026-08-17", today=TODAY)
    assert until == date(2026, 8, 31)


def test_invalid_since_format_raises():
    with pytest.raises(ValueError):
        parse_window("nonsense", None, None, today=TODAY)


def test_since_and_from_together_raises():
    with pytest.raises(ValueError):
        parse_window("7d", "2026-08-01", "2026-08-17", today=TODAY)


def test_from_without_to_raises():
    with pytest.raises(ValueError):
        parse_window(None, "2026-08-01", None, today=TODAY)


def test_filter_by_window_keeps_items_in_range():
    in_range = NormalizedItem(source="s", url="u1", title="t1", text="", published_date=date(2026, 8, 12))
    out_of_range = NormalizedItem(source="s", url="u2", title="t2", text="", published_date=date(2026, 1, 1))
    result = filter_by_window([in_range, out_of_range], since=date(2026, 8, 10), until=date(2026, 8, 17))
    assert result == [in_range]
