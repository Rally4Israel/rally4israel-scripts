from datetime import date, time
from r4ilpy.events import airtable_record_to_event


def test_copies_title_and_location():
    record = {
        "fields": {
            "Title": "Test Event",
            "Location": "Somewhere",
            "Start Time": "9:00am",
            "Date": "2024-01-02",
        }
    }
    event = airtable_record_to_event(record)

    assert event.title == "Test Event"
    assert event.location == "Somewhere"


def test_converts_start_time_to_time_object():
    record = {
        "fields": {
            "Title": "Test Event",
            "Start Time": "9:00am",
            "Date": "2024-01-02",
        }
    }
    event = airtable_record_to_event(record)
    assert event.start_time == time(9, 0)


def test_converts_start_time_to_None_if_no_start_time():
    record = {
        "fields": {
            "Title": "Test Event",
            "Date": "2024-01-02",
        }
    }
    event = airtable_record_to_event(record)
    assert event.start_time is None


def test_converts_date_to_date_object():
    record = {
        "fields": {
            "Title": "Test Event",
            "Start Time": "9:00am",
            "Date": "2024-01-02",
        }
    }
    event = airtable_record_to_event(record)
    assert event.date == date(2024, 1, 2)
