from freezegun import freeze_time
from r4ilpy.image_generators import EventImageGenerator, IntroImageGenerator
from r4ilpy.instagram import InstagramPoster
import pytest


@pytest.fixture
def get_test_poster(tmp_path):
    def _get_test_poster(events: list = []):
        class FakeInstagramClient:
            album_uploads = []

            def login(self):
                pass

            def album_upload(self, *args, **kwargs):
                self.album_uploads.append((args, kwargs))

        class FakeAirtableConnector:
            def fetchall(self):
                return events

        class TestIntroImageGenerator(IntroImageGenerator):
            base_path = str(tmp_path) + "/"

        class TestEventImageGenerator(EventImageGenerator):
            base_path = str(tmp_path) + "/"

        class TestInstagramPoster(InstagramPoster):
            base_path = str(tmp_path) + "/"
            airtable_conn_class = FakeAirtableConnector
            instagram_client_class = FakeInstagramClient
            intro_image_generator_class = TestIntroImageGenerator
            event_image_generator_class = TestEventImageGenerator

        return TestInstagramPoster()

    return _get_test_poster


def get_test_airtable_record(
    title="Test Event",
    event_date="2024-01-02",
    start_time="9:00am",
    location="Somewhere",
):
    return {
        "fields": {
            "Title": title,
            "Location": location,
            "Start Time": start_time,
            "Date": event_date,
        }
    }


def test_smoke(get_test_poster):
    get_test_poster().post()


@freeze_time("2024-01-01")
def test_uploads_album(get_test_poster):
    poster = get_test_poster([get_test_airtable_record(event_date="2024-01-02")])
    poster.post()
    assert len(poster.instagram_client.album_uploads) == 1
