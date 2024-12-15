from datetime import date, time
from functools import cached_property
from r4ilpy.airtable import AirtableCalendarViewConnector
from r4ilpy.events import Event, airtable_record_to_event
from r4ilpy.image_generators import (
    EventImageGenerator,
    IntroImageGenerator,
    generate_event_images,
)
from r4ilpy.settings import INSTAGRAM_PASSWORD, INSTAGRAM_SESSION_ID, INSTAGRAM_USERNAME
from instagrapi import Client
import os
from itertools import islice

IMAGE_PATH = "img/testing.jpg"


class InstagramClient(Client):
    def login(self) -> bool:
        if INSTAGRAM_SESSION_ID:
            self.login_by_sessionid(INSTAGRAM_SESSION_ID)
        else:
            return super().login(INSTAGRAM_USERNAME, INSTAGRAM_PASSWORD)


class InstagramPoster:
    base_path = "img/instagram/"
    instagram_client_class = InstagramClient
    airtable_conn_class = AirtableCalendarViewConnector
    intro_image_generator_class = IntroImageGenerator
    event_image_generator_class = EventImageGenerator

    @cached_property
    def instagram_client(self):
        client = self.instagram_client_class()
        client.login()
        return client

    @property
    def airtable_conn(self):
        return self.airtable_conn_class()

    @property
    def intro_image_generator(self):
        return self.intro_image_generator_class()

    def post(self):
        for batch_number, batch in enumerate(self.batched_events, start=1):
            self.post_event_batch(batch_number, batch)

    @cached_property
    def batched_events(self):
        events = self.get_events()

        def batched(iterable, batch_size):
            it = iter(iterable)
            while batch := list(islice(it, batch_size)):
                yield batch

        batched_events = batched(events, 19)
        return list(batched_events)

    def get_events(self):
        event = Event(
            title="Chicago (DePaul): Stop the Hate: Rally for Jewish Students",
            date=date(2024, 11, 21),
            start_time=time(17, 0),
            location=(
                "DePaul University - Lincoln Park Student Center, 2250 N. Sheffield Ave."
            ),
        )
        return [event] * 25
        records = self.airtable_conn.fetchall()
        events = [airtable_record_to_event(record) for record in records]
        return events

    @cached_property
    def total_event_batches(self):
        return len(self.batched_events)

    def post_event_batch(self, batch_number, batch):
        self.generate_batch_images(batch_number, batch)
        images_dir = f"{self.base_path}batches/{batch_number}/"
        image_paths = self.get_image_paths(images_dir)
        self.instagram_client.album_upload(
            paths=image_paths,
            caption=f"Batch {batch_number}: testing something...",
            extra_data={"invite_coauthor_user_ids": []},
        )

    def generate_batch_images(self, batch_number, batch):
        self.intro_image_generator_class(
            batch_no=batch_number, total_batches=self.total_event_batches
        ).generate()
        for event_no, event in enumerate(batch, start=1):
            zero_padded = str(event_no).zfill(2)
            self.event_image_generator_class(
                event, batch_no=batch_number, filename=f"event_image_{zero_padded}.jpg"
            ).generate()

    def get_image_paths(self, directory):
        """
        Get a list of image file paths in the given directory.
        Only includes .jpg, .jpeg, and .png files.
        Ensures intro_image.jpg is first, followed by other images in alphabetical order.
        """
        valid_extensions = [".jpg", ".jpeg", ".png"]
        image_paths = [
            os.path.join(directory, filename)
            for filename in os.listdir(directory)
            if any(filename.lower().endswith(ext) for ext in valid_extensions)
        ]

        # Separate intro_image.jpg and sort the rest alphabetically
        intro_image = [
            path for path in image_paths if os.path.basename(path) == "intro_image.jpg"
        ]
        other_images = sorted(
            [
                path
                for path in image_paths
                if os.path.basename(path) != "intro_image.jpg"
            ]
        )
        return intro_image + other_images


def main():
    client = InstagramClient()
    client.login()
    # collaborators_usernames = ["elizabeth.rand.311", "herutnyc"]
    collaborators_usernames = ["ari.abramowitz1"]
    collaborator_ids = [
        client.user_id_from_username(username) for username in collaborators_usernames
    ]

    media = client.album_upload(
        paths=[IMAGE_PATH, IMAGE_PATH],
        caption="testing something...",
        extra_data={"invite_coauthor_user_ids": collaborator_ids},
    )
    print(media)


IMAGE_DIR = "img/instagram"


def get_image_paths(directory):
    """
    Get a list of image file paths in the given directory.
    Only includes .jpg, .jpeg, and .png files.
    """
    valid_extensions = [".jpg", ".jpeg", ".png"]
    image_paths = [
        os.path.join(directory, filename)
        for filename in os.listdir(directory)
        if any(filename.lower().endswith(ext) for ext in valid_extensions)
    ]
    return image_paths


def generate_post():
    # Generate event images (this assumes the images are saved in img/instagram)
    generate_event_images()

    # Get all image paths from img/instagram
    image_paths = get_image_paths("img/instagram/batches/1")

    if not image_paths:
        print("No images found in the directory.")
        return

    # Instagram login setup
    client = InstagramClient()
    client.login()

    # Collaborator usernames and user IDs
    collaborators_usernames = ["ari.abramowitz1"]
    collaborator_ids = [
        client.user_id_from_username(username) for username in collaborators_usernames
    ]

    # Post the images to Instagram
    media = client.album_upload(
        paths=image_paths,
        caption="Event updates from Rally4Israel!",
        extra_data={"invite_coauthor_user_ids": collaborator_ids},
    )
    print("Posted media:", media)


if __name__ == "__main__":
    InstagramPoster().post()
