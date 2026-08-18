import re
from datetime import date, timedelta

from eureka_news.models import NormalizedItem

AGENDA_LOOKAHEAD_DAYS = 14
_SINCE_PATTERN = re.compile(r"^(\d+)d$")


def parse_window(
    since: str | None,
    from_date: str | None,
    to_date: str | None,
    today: date,
) -> tuple[date, date]:
    if since and (from_date or to_date):
        raise ValueError("Use either --since or --from/--to, not both")

    if since:
        match = _SINCE_PATTERN.match(since)
        if not match:
            raise ValueError(f'Invalid --since value: {since!r} (expected format like "7d")')
        days = int(match.group(1))
        start, end = today - timedelta(days=days), today
    elif from_date or to_date:
        if not (from_date and to_date):
            raise ValueError("Both --from and --to are required together")
        start, end = date.fromisoformat(from_date), date.fromisoformat(to_date)
    else:
        start, end = today - timedelta(days=7), today

    if end >= today:
        end = max(end, today + timedelta(days=AGENDA_LOOKAHEAD_DAYS))

    return start, end


def filter_by_window(items: list[NormalizedItem], since: date, until: date) -> list[NormalizedItem]:
    return [item for item in items if since <= item.published_date <= until]
