import logging
from datetime import date

from eureka_news.adapters.base import Adapter
from eureka_news.models import NormalizedItem

logger = logging.getLogger(__name__)


def fetch_all(adapters: list[Adapter], since: date, until: date) -> list[NormalizedItem]:
    items: list[NormalizedItem] = []
    for adapter in adapters:
        try:
            items.extend(adapter.fetch(since, until))
        except Exception:
            logger.warning("Adapter %s failed", getattr(adapter, "name", repr(adapter)), exc_info=True)
    return items
