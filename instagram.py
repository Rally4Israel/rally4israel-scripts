from settings import INSTAGRAM_PASSWORD, INSTAGRAM_SESSION_ID, INSTAGRAM_USERNAME

IMAGE_PATH = "img/testing.jpg"


def main():
    from instagrapi import Client

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


if __name__ == "__main__":
    main()
