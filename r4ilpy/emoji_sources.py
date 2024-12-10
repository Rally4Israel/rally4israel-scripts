from io import BytesIO
import os
from pilmoji.source import TwitterEmojiSource


class TwemojiEmojiSource(TwitterEmojiSource):
    """
    Use twemoji emojis from the repo if they are found, otherwise use the
    regular TwitterEmojiSource

    Emojis copied from https://github.com/twitter/twemoji
    """

    def __init__(self, emoji_folder="emojis/twemoji"):
        super().__init__()
        self.emoji_folder = emoji_folder

    def get_emoji(self, emoji: str) -> BytesIO | None:
        file_path = os.path.join(self.emoji_folder, self.emoji_to_filename(emoji))
        if os.path.exists(file_path):
            return open(file_path, "rb")  # Return a file-like object
        print(f"emoji not found: {emoji}; {file_path}")
        return super().get_emoji(emoji)

    def emoji_to_filename(self, emoji):
        """
        Convert an emoji or emoji sequence into the corresponding Twemoji filename.
        """
        import unicodedata

        # Convert the emoji to its codepoints, ignoring the variation selector (U+FE0F)
        codepoints = [
            f"{ord(char):x}"
            for char in emoji
            if unicodedata.name(char) != "VARIATION SELECTOR-16"
        ]
        return "-".join(codepoints) + ".png"
