from datetime import datetime, timedelta, timezone
from functools import cached_property
from settings import (
    AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID,
    AIRTABLE_CALENDAR_VIEW_NAME,
    AIRTABLE_EVENTS_TABLE_ID,
)
from pyairtable import Api as AirtableAPI


class AirtableRecordsFetcher:
    def __init__(self, api_key, base_id, table_id, options) -> None:
        self.api_key = api_key
        self.base_id = base_id
        self.table_id = table_id
        self.options = options

    def fetch(self):
        return self.table.all(**self.options)

    @cached_property
    def api(self):
        return AirtableAPI(AIRTABLE_API_KEY)

    @cached_property
    def table(self):
        return self.api.table(self.base_id, self.table_id)


class AirtableRecordsFilter:
    def __init__(self, records, start_time=None, cutoff_days=10, min_events=10):
        self.records = records
        self.start_time = start_time or datetime.now(timezone.utc)
        self.cutoff_days = cutoff_days
        self.min_events = min_events

    def filter(self):
        records = sorted(
            filter(self.is_future_event, self.records),
            key=self.sort_by_start_date,
        )
        records = self.filter_out_recurring_events(records)
        events_before_cutoff = self.get_events_before_cutoff(records, self.cutoff_days)
        if len(events_before_cutoff) >= self.min_events:
            return events_before_cutoff
        else:
            return records[: self.min_events + 1]

    def get_events_before_cutoff(self, records, days):
        end_date = self.start_time + timedelta(days=days)
        return [
            record
            for record in records
            if datetime.fromisoformat(record["fields"]["Start"]) <= end_date
        ]

    def is_future_event(self, record):
        start = datetime.fromisoformat(record["fields"]["Start"])
        start_date_only = start.date()
        current_date_only = self.start_time.date()
        return start_date_only >= current_date_only

    def sort_by_start_date(self, record):
        return datetime.fromisoformat(record["fields"]["Start"])

    def filter_out_recurring_events(self, records):
        recurring_event_ids = set()
        filtered_records = []
        for record in records:
            recurring_event_id = record["fields"].get("Recurring Event ID")
            if not recurring_event_id or recurring_event_id not in recurring_event_ids:
                filtered_records.append(record)
                if recurring_event_id:
                    recurring_event_ids.add(recurring_event_id)
        return filtered_records


if __name__ == "__main__":
    records_fetcher = AirtableRecordsFetcher(
        AIRTABLE_API_KEY,
        AIRTABLE_BASE_ID,
        AIRTABLE_EVENTS_TABLE_ID,
        {"view": AIRTABLE_CALENDAR_VIEW_NAME},
    )
    records = records_fetcher.fetch()
    filtered_records = AirtableRecordsFilter(records).filter()
    print(len(filtered_records))
