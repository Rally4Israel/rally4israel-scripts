from freezegun import freeze_time
from r4ilpy.airtable import AirtableRecordsFilterer


def create_event(
    title="Default Event",
    start="2024-10-14T17:45:00.000Z",
    all_day=False,
    location="",
    recurring_event_id="",
):
    return {
        "fields": {
            "Title": title,
            "All Day": all_day,
            "Start": start,
            "Location": location,
            "Recurring Event ID": recurring_event_id,
        }
    }


@freeze_time("2021-01-01")
def test_only_includes_future_events():
    records = [
        create_event(title="Past Event", start="2020-10-14T17:45:00.000Z"),
        create_event(title="Future Event", start="2022-10-14T17:45:00.000Z"),
    ]
    filtered_records = AirtableRecordsFilterer(records).filter()

    assert len(filtered_records) == 1
    assert "Future Event" in filtered_records[0]["fields"]["Title"]


@freeze_time("2021-01-01")
def test_sorts_events_by_start_time():
    records = [
        create_event(title="Event 3", start="2022-03-14T17:45:00.000Z"),
        create_event(title="Event 1", start="2022-01-14T17:45:00.000Z"),
        create_event(title="Event 2", start="2022-02-14T17:45:00.000Z"),
    ]
    filtered_records = AirtableRecordsFilterer(records).filter()

    assert "Event 1" in filtered_records[0]["fields"]["Title"]
    assert "Event 2" in filtered_records[1]["fields"]["Title"]
    assert "Event 3" in filtered_records[2]["fields"]["Title"]


@freeze_time("2021-01-01")
def test_only_includes_earliest_upcoming_instance_of_recurring_event():
    recurring_event_id = "some-id"
    records = [
        create_event(
            title="Past Event",
            start="2020-10-14T17:45:00.000Z",
            recurring_event_id=recurring_event_id,
        ),
        create_event(
            title="Upcoming Event",
            start="2021-10-14T17:45:00.000Z",
            recurring_event_id=recurring_event_id,
        ),
        create_event(
            title="Later Event",
            start="2022-10-14T17:45:00.000Z",
            recurring_event_id=recurring_event_id,
        ),
    ]
    filtered_records = AirtableRecordsFilterer(records).filter()

    assert len(filtered_records) == 1
    assert "Upcoming Event" in filtered_records[0]["fields"]["Title"]


@freeze_time("2021-01-01")
def test_only_includes_events_for_today_plus_next_10_days():
    days = [1, 11, 12]
    records = [
        create_event(
            title=f"Day {day} Event", start=f"2021-01-{str(day).zfill(2)}T00:00:00Z"
        )
        for day in days
    ]
    filtered_records = AirtableRecordsFilterer(records, min_events=1).filter()

    assert len(filtered_records) == 2
    assert not any(
        record["fields"]["Title"] == "Day 12 Event" for record in filtered_records
    )


@freeze_time("2021-01-01")
def test_includes_up_to_min_events_count_if_fewer_than_min_in_next_10_days():
    days = [1, 11, 12]
    records = [
        create_event(
            title=f"Day {day} Event", start=f"2021-01-{str(day).zfill(2)}T00:00:00Z"
        )
        for day in days
    ]
    filtered_records = AirtableRecordsFilterer(records, min_events=3).filter()

    assert len(filtered_records) == 3
    assert filtered_records[-1]["fields"]["Title"] == "Day 12 Event"
