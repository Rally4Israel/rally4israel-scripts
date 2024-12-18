from datetime import date, time
from r4ilpy.events import Event
from r4ilpy.image_generators import EventImageGenerator


def test_saves_image_in_directory_based_on_batch_number(tmp_path):
    event = Event("Test Event", date(2024, 1, 1), time(1, 1), "Somewhere")
    generator = EventImageGenerator(
        base_path=str(tmp_path) + "/",
        batch_no=1,
        event=event,
        filename="event_image_0.jpg",
    )
    generator.generate()

    expected_filepath = tmp_path / "batches/1/event_image_0.jpg"

    assert expected_filepath.exists()
    assert expected_filepath.is_file()
