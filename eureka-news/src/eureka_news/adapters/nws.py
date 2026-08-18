from datetime import date

import requests

from eureka_news.models import NormalizedItem

NWS_URL = "https://api.water.noaa.gov/nwps/v1/gauges/erkm7"
GAUGE_PAGE_URL = "https://water.noaa.gov/gauges/erkm7"
NO_FORECAST_SENTINEL = -999


class NwsAdapter:
    name = "NWS Meramec River Forecast (Eureka, gauge erkm7)"

    def fetch(self, since: date, until: date) -> list[NormalizedItem]:
        today = date.today()
        if not (since <= today <= until):
            return []

        response = requests.get(NWS_URL, timeout=10)
        response.raise_for_status()
        data = response.json()

        observed = data["status"]["observed"]
        stage = observed["primary"]
        unit = observed.get("primaryUnit", "ft")
        category = observed["floodCategory"]

        forecast = data["status"].get("forecast", {})
        forecast_stage = forecast.get("primary")
        forecast_text = ""
        if forecast_stage is not None and forecast_stage != NO_FORECAST_SENTINEL:
            forecast_text = f" Forecast stage: {forecast_stage} {unit} ({forecast.get('floodCategory', 'unknown')})."

        title = f"Meramec River at Eureka: {category.replace('_', ' ')}"
        text = f"Observed stage: {stage} {unit} (category: {category})." + forecast_text

        return [
            NormalizedItem(
                source=self.name,
                url=GAUGE_PAGE_URL,
                title=title,
                text=text,
                published_date=today,
                category_hint="meramec_river",
            )
        ]
