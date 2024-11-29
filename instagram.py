import requests
from dotenv import load_dotenv
import os

load_dotenv()

# Replace these with your values
ACCESS_TOKEN = os.getenv("INSTAGRAM_ACCESS_TOKEN")
INSTAGRAM_ACCOUNT_ID = os.getenv("INSTAGRAM_ACCOUNT_ID")
print(ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID)
IMAGE_URL = "https://www.clker.com/cliparts/4/f/8/7/15167089401654288563clipart-of-students-testing.med.png"  # Image must be hosted online
CAPTION = "Your image caption here"


# Step 1: Upload the image to Instagram
def upload_image(account_id, image_url, caption, access_token):
    upload_url = f"https://graph.facebook.com/v17.0/{account_id}/media"
    payload = {"image_url": image_url, "caption": caption, "access_token": access_token}

    response = requests.post(upload_url, data=payload)
    if response.status_code == 200:
        response_data = response.json()
        print(f"Media ID: {response_data['id']}")
        return response_data["id"]
    else:
        print(f"Failed to upload image: {response.text}")
        return None


# Step 2: Publish the uploaded image
def publish_image(account_id, creation_id, access_token):
    publish_url = f"https://graph.facebook.com/v17.0/{account_id}/media_publish"
    payload = {"creation_id": creation_id, "access_token": access_token}

    response = requests.post(publish_url, data=payload)
    if response.status_code == 200:
        print(f"Post published successfully: {response.json()}")
    else:
        print(f"Failed to publish post: {response.text}")


def main():
    creation_id = upload_image(INSTAGRAM_ACCOUNT_ID, IMAGE_URL, CAPTION, ACCESS_TOKEN)
    if creation_id:
        publish_image(INSTAGRAM_ACCOUNT_ID, creation_id, ACCESS_TOKEN)


if __name__ == "__main__":
    main()
