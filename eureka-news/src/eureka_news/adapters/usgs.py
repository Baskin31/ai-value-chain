from datetime import date

import requests

from eureka_news.models import NormalizedItem

USGS_URL = "https://waterservices.usgs.gov/nwis/iv/?sites=07019000&format=json&parameterCd=00060,00065"
GAUGE_PAGE_URL = "https://waterdata.usgs.gov/monitoring-location/07019000/"


class UsgsAdapter:
    name = "USGS Meramec River Gauge (Eureka, site 07019000)"

    def fetch(self, since: date, until: date) -> list[NormalizedItem]:
        today = date.today()
        if not (since <= today <= until):
            return []

        response = requests.get(USGS_URL, timeout=10)
        response.raise_for_status()
        data = response.json()

        readings: dict[str, str] = {}
        for series in data["value"]["timeSeries"]:
            code = series["variable"]["variableCode"][0]["value"]
            values = series["values"][0]["value"]
            if values:
                readings[code] = values[-1]["value"]

        discharge = readings.get("00060")
        gauge_height = readings.get("00065")
        text = f"Discharge: {discharge} cfs, Gauge height: {gauge_height} ft"

        return [
            NormalizedItem(
                source=self.name,
                url=GAUGE_PAGE_URL,
                title="Meramec River at Eureka: current conditions",
                text=text,
                published_date=today,
                category_hint="meramec_river",
            )
        ]
