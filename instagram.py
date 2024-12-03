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

    media = cl.album_upload(
        paths=[IMAGE_PATH, IMAGE_PATH],
        caption="testing something...",
    )
    print(media)


if __name__ == "__main__":
    main()
