from r4ilpy.image_generators import generate_event_images
from r4ilpy.settings import INSTAGRAM_PASSWORD, INSTAGRAM_SESSION_ID, INSTAGRAM_USERNAME
from instagrapi import Client
import os

IMAGE_PATH = "img/testing.jpg"


def main():
    client = Client()
    print(len(INSTAGRAM_USERNAME))
    print(len(INSTAGRAM_PASSWORD))
    if INSTAGRAM_SESSION_ID:
        client.login_by_sessionid(INSTAGRAM_SESSION_ID)
    else:
        client.login(INSTAGRAM_USERNAME, INSTAGRAM_PASSWORD)
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
    image_paths = get_image_paths(IMAGE_DIR)

    if not image_paths:
        print("No images found in the directory.")
        return

    # Instagram login setup
    client = Client()
    if INSTAGRAM_SESSION_ID:
        client.login_by_sessionid(INSTAGRAM_SESSION_ID)
    else:
        client.login(INSTAGRAM_USERNAME, INSTAGRAM_PASSWORD)

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
