from datetime import datetime, timedelta, timezone
from functools import cached_property
from r4ilpy.settings import (
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
        return self._table.all(**self.options)

    @cached_property
    def _api(self):
        return AirtableAPI(self.api_key)

    @cached_property
    def _table(self):
        return self._api.table(self.base_id, self.table_id)


class AirtableRecordsFilterer:
    def __init__(self, records, cutoff_days=10, min_events=10):
        self.records = records
        self.cutoff_days = cutoff_days
        self.min_events = min_events

    def filter(self, start_time=None):
        self.start_time = start_time or datetime.now(timezone.utc)
        records = sorted(
            filter(self._is_future_event, self.records),
            key=self._sort_by_start_date,
        )
        records = self._filter_out_recurring_events(records)
        events_before_cutoff = self._get_events_before_cutoff(records, self.cutoff_days)
        if len(events_before_cutoff) >= self.min_events:
            return events_before_cutoff
        else:
            return records[: self.min_events + 1]

    def _get_events_before_cutoff(self, records, days):
        end_date = self.start_time + timedelta(days=days)
        return [
            record
            for record in records
            if datetime.fromisoformat(record["fields"]["Start"]) <= end_date
        ]

    def _is_future_event(self, record):
        start = datetime.fromisoformat(record["fields"]["Start"])
        start_date_only = start.date()
        current_date_only = self.start_time.date()
        return start_date_only >= current_date_only

    def _sort_by_start_date(self, record):
        return datetime.fromisoformat(record["fields"]["Start"])

    def _filter_out_recurring_events(self, records):
        recurring_event_ids = set()
        filtered_records = []
        for record in records:
            recurring_event_id = record["fields"].get("Recurring Event ID")
            if not recurring_event_id or recurring_event_id not in recurring_event_ids:
                filtered_records.append(record)
                if recurring_event_id:
                    recurring_event_ids.add(recurring_event_id)
        return filtered_records


def get_filtered_calendar_records(start_time=None):
    records = AirtableRecordsFetcher(
        AIRTABLE_API_KEY,
        AIRTABLE_BASE_ID,
        AIRTABLE_EVENTS_TABLE_ID,
        {"view": AIRTABLE_CALENDAR_VIEW_NAME},
    ).fetch()
    return AirtableRecordsFilterer(records).filter(start_time=start_time)
