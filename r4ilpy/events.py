from dataclasses import dataclass
from datetime import datetime


@dataclass
class Event:
    title: str
    date: str
    start_time: str | None
    location: str


def airtable_record_to_event(record: dict) -> Event:
    record_fields = record["fields"]
    start_time_str = record_fields.get("Start Time")
    if start_time_str:
        start_time = datetime.strptime(start_time_str, "%I:%M%p").time()
    else:
        start_time = None
    date = datetime.strptime(record_fields.get("Date"), "%Y-%m-%d").date()

    return Event(
        title=record_fields.get("Title"),
        date=date,
        start_time=start_time,
        location=record_fields.get("Location"),
    )
