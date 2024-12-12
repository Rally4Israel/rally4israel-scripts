from r4ilpy.events import Event
from r4ilpy.instagram import InstagramPoster


def get_test_poster(events: list[Event] = []):
    class FakeInstagramClient:
        def login(self):
            pass

    class FakeAirtableConnector:
        def fetchall(self):
            return events

    class TestInstagramPoster(InstagramPoster):
        airtable_conn_class = FakeAirtableConnector
        instagram_client_class = FakeInstagramClient

    return TestInstagramPoster()


def test_smoke():
    get_test_poster().post()
