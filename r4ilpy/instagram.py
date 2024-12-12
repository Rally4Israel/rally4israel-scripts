from functools import cached_property
from r4ilpy.airtable import AirtableCalendarViewConnector
from r4ilpy.events import airtable_record_to_event
from r4ilpy.image_generators import (
    EventImageGenerator,
    IntroImageGenerator,
    generate_event_images,
)
from r4ilpy.settings import INSTAGRAM_PASSWORD, INSTAGRAM_SESSION_ID, INSTAGRAM_USERNAME
from instagrapi import Client
import os

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
        records = self.airtable_conn.fetchall()
        events = [airtable_record_to_event(record) for record in records]
        self.intro_image_generator.generate()
        for event in events:
            self.event_image_generator_class(event)

        images_dir = f"{self.base_path}batches/1/"
        image_paths = get_image_paths(images_dir)
        self.instagram_client.album_upload(
            paths=image_paths,
            caption="testing something...",
            extra_data={"invite_coauthor_user_ids": []},
        )


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
    generate_post()
