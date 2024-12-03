from dotenv import load_dotenv
import os

load_dotenv()

INSTAGRAM_USERNAME = os.getenv("INSTAGRAM_USERNAME")
INSTAGRAM_PASSWORD = os.getenv("INSTAGRAM_PASSWORD")
IMAGE_PATH = "img/testing.jpg"


def main():
    from instagrapi import Client

    cl = Client()
    cl.login(INSTAGRAM_USERNAME, INSTAGRAM_PASSWORD)
    # collaborators_usernames = ["elizabeth.rand.311", "herutnyc"]
    collaborators_usernames = ["ari.abramowitz1"]
    collaborator_ids = [
        cl.user_id_from_username(username) for username in collaborators_usernames
    ]

    media = cl.album_upload(
        paths=[IMAGE_PATH, IMAGE_PATH],
        caption="testing something...",
        extra_data={"invite_coauthor_user_ids": collaborator_ids},
    )
    print(media)


if __name__ == "__main__":
    main()
