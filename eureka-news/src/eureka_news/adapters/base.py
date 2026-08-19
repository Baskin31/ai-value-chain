from datetime import date
from typing import Protocol

from eureka_news.models import NormalizedItem


class Adapter(Protocol):
    name: str

    def fetch(self, since: date, until: date) -> list[NormalizedItem]: ...
