from datetime import date, datetime, time
from PIL import Image, ImageDraw, ImageFont
import textwrap
import subprocess
import platform
from r4ilpy.emoji_sources import TwemojiEmojiSource
from r4ilpy.events import Event, airtable_record_to_event
from r4ilpy.airtable import get_filtered_calendar_records
from pilmoji import Pilmoji
import os


class IntroImageGenerator:
    padding = 60

    def __init__(self, filename="intro_image.jpg"):
        self.filename = f"img/instagram/{filename}"
        self.width = self.height = 1080
        self.border_thickness = 15
        self.border_radius = 30
        self.background_color = (0, 92, 144)  # Blue
        self.border_color = (0, 0, 0)  # Black
        self.header_footer_background = (232, 232, 232, 200)

    def create_base_image(self):
        return Image.new(
            "RGB",
            (
                self.width + 2 * self.border_thickness,
                self.height + 2 * self.border_thickness,
            ),
            self.background_color,
        )

    def wrap_text(self, text, max_chars=40):
        return textwrap.wrap(text, width=max_chars)

    def get_font_size(self, font, text):
        try:
            return font.getsize(text)
        except AttributeError:
            left, top, right, bottom = font.getbbox(text)
            tw, th = right - left, bottom - top
            return tw, th

    def draw_icon_and_text(
        self, pilmoji, icon, text, y_position, font, max_width=520, line_spacing=30
    ):
        """Draw an emoji (bullet point) and wrapped text."""
        lines = self.wrap_text(
            text, max_chars=max_width // self.get_font_size(self.font_subtitle, " ")[0]
        )
        x_icon = self.padding
        x_text = x_icon + 75  # Space for emoji
        line_height = self.get_font_size(font, "A")[1] + line_spacing
        for i, line in enumerate(lines):
            if i == 0 and icon:
                pilmoji.text((x_icon, y_position), icon, font=font, fill="white")
            pilmoji.text(
                (x_text, y_position - 10),
                line,
                font=font,
                fill="white",
            )
            y_position += line_height
        return y_position

    def generate(self, open_when_done=False, post_time=None):
        self.post_time = post_time or datetime.now()
        base = self.create_base_image()
        draw = ImageDraw.Draw(base)

        # Draw border
        draw.rounded_rectangle(
            [
                (self.border_thickness, self.border_thickness),
                (
                    self.width + self.border_thickness,
                    self.height + self.border_thickness,
                ),
            ],
            radius=self.border_radius,
            outline=self.border_color,
            width=self.border_thickness,
        )

        self.load_fonts()

        # Prepare an overlay for transparency
        overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)

        # Define top message content
        formatted_post_time = self.post_time.strftime("%A, %b %d, %Y")
        header_lines = [
            ("Rally4Israel Rally Roundup", self.font_title),
            (formatted_post_time, self.font_subtitle),
        ]

        # Calculate header dimensions
        line_heights = [
            self.get_font_size(font, text)[1] for text, font in header_lines
        ]
        total_header_height = sum(line_heights) + (len(header_lines) - 1) * 10
        rect_padding = 20
        rect_width = self.width - 2 * self.padding
        rect_height = total_header_height + 2 * rect_padding

        # Draw rounded rectangle for the top message
        rect_x1 = (base.width - rect_width) // 2
        rect_y1 = self.padding
        rect_x2 = rect_x1 + rect_width
        rect_y2 = rect_y1 + rect_height
        rect_color = self.header_footer_background
        overlay_draw.rounded_rectangle(
            [(rect_x1, rect_y1), (rect_x2, rect_y2)],
            radius=20,
            fill=rect_color,
        )

        # Composite the overlay onto the base image
        base = Image.alpha_composite(base.convert("RGBA"), overlay)

        # Add text to the top message
        draw = ImageDraw.Draw(
            base
        )  # Reinitialize the draw object for the updated image
        y_offset = rect_y1 + rect_padding
        for text, font in header_lines:
            text_width, text_height = self.get_font_size(font, text)
            x_position = rect_x1 + (rect_width - text_width) // 2
            draw.text((x_position, y_offset), text, font=font, fill="black")
            y_offset += text_height + 10

        # Prepare content
        y_position = 350

        # Draw content
        descriptive_texts = [
            (
                "🪧",
                "Listing rallies for Israel, the Jewish community, and the hostages' release",
            ),
            ("🔗", "Full calendar at rally4israel.com/calendar (link in bio)"),
            ("👉", "Send us your rally info to get featured!"),
        ]
        with Pilmoji(base, source=TwemojiEmojiSource) as pilmoji:
            y_position += 30
            for emoji, text in descriptive_texts:
                y_position = self.draw_icon_and_text(
                    pilmoji, emoji, text, y_position, self.font_subtitle
                )
                y_position += 40

        """Draw a bottom message with the Instagram logo."""
        message = "Follow @rally4israel for more updates"
        font = self.font_subtitle
        # Load Instagram logo
        logo_size = 50
        logo_path = "img/icons/instagram_logo.png"
        instagram_logo = (
            Image.open(logo_path).resize((logo_size, logo_size)).convert("RGBA")
        )
        # Calculate positions
        text_width, text_height = self.get_font_size(font, message)
        # Calculate positions for bottom message
        total_width = logo_size + 10 + text_width  # Logo + spacing + text
        x_position = (base.width - total_width) // 2  # Center the group (logo + text)
        y_position = self.height - self.padding - text_height + 10  # Adjust padding
        # Define rounded rectangle properties
        rect_padding = 20
        rect_x1 = x_position - rect_padding
        rect_y1 = y_position - rect_padding + 5
        rect_x2 = x_position + total_width + rect_padding
        rect_y2 = y_position + text_height + rect_padding
        rect_color = self.header_footer_background
        # Create a temporary overlay for semi-transparency
        overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        overlay_draw.rounded_rectangle(
            [(rect_x1, rect_y1), (rect_x2, rect_y2)],
            radius=15,
            fill=rect_color,
        )
        base = Image.alpha_composite(base.convert("RGBA"), overlay)
        # Paste Instagram logo
        base.paste(instagram_logo, (x_position, y_position), mask=instagram_logo)
        # Draw text next to the logo
        draw = ImageDraw.Draw(base)
        text_x = x_position + logo_size + 15  # Position text after the logo
        draw.text((text_x, y_position - 10), message, font=font, fill="black")
        # Convert the final image to RGB mode (to save as JPEG)
        base = base.convert("RGB")

        # Save image
        os.makedirs(os.path.dirname(self.filename), exist_ok=True)
        base.save(self.filename)

        # Show the image
        if open_when_done:
            self.open()

    def load_fonts(self):
        try:
            font_dir = os.path.join(os.path.dirname(__file__), "../fonts")
            self.font_title = ImageFont.truetype(
                os.path.join(font_dir, "NotoSans-Bold.ttf"), 65
            )
            self.font_subtitle = ImageFont.truetype(
                os.path.join(font_dir, "NotoSans-Regular.ttf"), 50
            )
        except OSError:
            print("Font not found, using default font.")
            self.font_title = self.font_subtitle = ImageFont.load_default()

    def open(self):
        """
        Open the saved image based on the OS
        """
        if platform.system() == "Darwin":  # macOS
            subprocess.run(["open", self.filename])
        elif platform.system() == "Windows":  # Windows
            subprocess.run(["start", self.filename], shell=True)
        else:  # Linux or other Unix-like systems
            subprocess.run(["xdg-open", self.filename])


class EventImageGenerator:
    padding = 60

    def __init__(self, event: Event, filename="event_image.jpg"):
        self.event = event
        self.filename = f"img/instagram/{filename}"
        self.width = self.height = 1080
        self.border_thickness = 15
        self.border_radius = 30
        self.background_color = (0, 92, 144)  # Blue
        self.border_color = (0, 0, 0)  # Black
        self.header_footer_background = (232, 232, 232, 200)

    @property
    def formatted_date(self):
        return self.event.date.strftime("%A, %b %d")

    @property
    def formatted_start_time(self):
        return self.event.start_time.strftime("%-I:%M %p").lower()

    def create_base_image(self):
        return Image.new(
            "RGB",
            (
                self.width + 2 * self.border_thickness,
                self.height + 2 * self.border_thickness,
            ),
            self.background_color,
        )

    def wrap_text(self, text, max_chars=40):
        return textwrap.wrap(text, width=max_chars)

    def get_font_size(self, font, text):
        try:
            return font.getsize(text)
        except AttributeError:
            left, top, right, bottom = font.getbbox(text)
            tw, th = right - left, bottom - top
            return tw, th

    def draw_icon_and_text(
        self, pilmoji, icon, text, y_position, font, max_width=500, line_spacing=30
    ):
        """Draw an emoji (bullet point) and wrapped text."""
        lines = self.wrap_text(
            text, max_chars=max_width // self.get_font_size(self.font_details, " ")[0]
        )
        x_icon = self.padding
        x_text = x_icon + 75  # Space for emoji
        line_height = self.get_font_size(font, "A")[1] + line_spacing
        for i, line in enumerate(lines):
            if i == 0 and icon:
                pilmoji.text((x_icon, y_position), icon, font=font, fill="white")
            pilmoji.text(
                (x_text, y_position - 7),
                line,
                font=font,
                fill="white",
            )
            y_position += line_height
        return y_position

    def generate(self, open_when_done=False, post_time=None):
        self.post_time = post_time or datetime.now()
        base = self.create_base_image()
        draw = ImageDraw.Draw(base)

        # Draw border
        draw.rounded_rectangle(
            [
                (self.border_thickness, self.border_thickness),
                (
                    self.width + self.border_thickness,
                    self.height + self.border_thickness,
                ),
            ],
            radius=self.border_radius,
            outline=self.border_color,
            width=self.border_thickness,
        )

        self.load_fonts()

        # Prepare an overlay for transparency
        overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)

        # Define top message content
        header_font_large = self.font_event
        header_font_small = self.font_details
        formatted_post_time = self.post_time.strftime("%A, %b %d, %Y")
        header_lines = [
            ("Rally4Israel Rally Roundup", header_font_large),
            (formatted_post_time, header_font_small),
        ]

        # Calculate header dimensions
        line_heights = [
            self.get_font_size(font, text)[1] for text, font in header_lines
        ]
        total_header_height = sum(line_heights) + (len(header_lines) - 1) * 10
        rect_padding = 20
        rect_width = self.width - 2 * self.padding
        rect_height = total_header_height + 2 * rect_padding

        # Draw rounded rectangle for the top message
        rect_x1 = (base.width - rect_width) // 2
        rect_y1 = self.padding
        rect_x2 = rect_x1 + rect_width
        rect_y2 = rect_y1 + rect_height
        rect_color = self.header_footer_background
        overlay_draw.rounded_rectangle(
            [(rect_x1, rect_y1), (rect_x2, rect_y2)],
            radius=20,
            fill=rect_color,
        )

        # Composite the overlay onto the base image
        base = Image.alpha_composite(base.convert("RGBA"), overlay)

        # Add text to the top message
        draw = ImageDraw.Draw(
            base
        )  # Reinitialize the draw object for the updated image
        y_offset = rect_y1 + rect_padding
        for text, font in header_lines:
            text_width, text_height = self.get_font_size(font, text)
            x_position = (self.width - text_width) // 2  # Center text
            draw.text((x_position, y_offset), text, font=font, fill="black")
            y_offset += text_height + 10

        # Prepare content
        title_lines = self.wrap_text(self.event.title, max_chars=36)
        y_position = 250

        # Draw content
        with Pilmoji(base, source=TwemojiEmojiSource) as pilmoji:
            for line in title_lines:
                pilmoji.text(
                    (self.padding, y_position), line, font=self.font_event, fill="white"
                )
                y_position += self.get_font_size(self.font_event, line)[1] + 20
            y_position += 30
            y_position = self.draw_icon_and_text(
                pilmoji, "🗓️", self.formatted_date, y_position, self.font_details
            )
            y_position = self.draw_icon_and_text(
                pilmoji, "⏰", self.formatted_start_time, y_position, self.font_details
            )
            y_position = self.draw_icon_and_text(
                pilmoji,
                "📌",
                self.event.location.strip(),
                y_position,
                self.font_details,
            )

        """Draw a bottom message with the Instagram logo."""
        message = "Follow @rally4israel for more updates"
        font = self.font_details
        # Load Instagram logo
        logo_size = 50
        logo_path = "img/icons/instagram_logo.png"
        instagram_logo = (
            Image.open(logo_path).resize((logo_size, logo_size)).convert("RGBA")
        )
        # Calculate positions
        text_width, text_height = self.get_font_size(font, message)
        # Calculate positions for bottom message
        total_width = logo_size + 10 + text_width  # Logo + spacing + text
        x_position = (base.width - total_width) // 2  # Center the group (logo + text)
        y_position = self.height - self.padding - text_height + 10  # Adjust padding
        # Define rounded rectangle properties
        rect_padding = 20
        rect_x1 = x_position - rect_padding
        rect_y1 = y_position - rect_padding + 5
        rect_x2 = x_position + total_width + rect_padding
        rect_y2 = y_position + text_height + rect_padding
        rect_color = self.header_footer_background
        # Create a temporary overlay for semi-transparency
        overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        overlay_draw.rounded_rectangle(
            [(rect_x1, rect_y1), (rect_x2, rect_y2)],
            radius=15,
            fill=rect_color,
        )
        base = Image.alpha_composite(base.convert("RGBA"), overlay)
        # Paste Instagram logo
        base.paste(instagram_logo, (x_position, y_position), mask=instagram_logo)
        # Draw text next to the logo
        draw = ImageDraw.Draw(base)
        text_x = x_position + logo_size + 10  # Position text after the logo
        draw.text((text_x, y_position), message, font=font, fill="black")
        # Convert the final image to RGB mode (to save as JPEG)
        base = base.convert("RGB")

        # Save image
        os.makedirs(os.path.dirname(self.filename), exist_ok=True)
        base.save(self.filename)

        # Show the image
        if open_when_done:
            self.open()

    def load_fonts(self):
        try:
            font_dir = os.path.join(os.path.dirname(__file__), "../fonts")
            self.font_event = ImageFont.truetype(
                os.path.join(font_dir, "NotoSans-Bold.ttf"), 50
            )
            self.font_details = ImageFont.truetype(
                os.path.join(font_dir, "NotoSans-Regular.ttf"), 45
            )
        except OSError:
            print("Font not found, using default font.")
            self.font_event = self.font_details = ImageFont.load_default()

    def open(self):
        """
        Open the saved image based on the OS
        """
        if platform.system() == "Darwin":  # macOS
            subprocess.run(["open", self.filename])
        elif platform.system() == "Windows":  # Windows
            subprocess.run(["start", self.filename], shell=True)
        else:  # Linux or other Unix-like systems
            subprocess.run(["xdg-open", self.filename])


def generate_test_image():
    event = Event(
        title="Chicago (DePaul): Stop the Hate: Rally for Jewish Students",
        date=date(2024, 11, 21),
        start_time=time(17, 0),
        location=(
            "DePaul University - Lincoln Park Student Center, 2250 N. Sheffield Ave."
        ),
    )

    EventImageGenerator(event).generate(open_when_done=True)


def generate_event_images(open_when_done=False):
    for i, record in enumerate(get_filtered_calendar_records()):
        event = airtable_record_to_event(record)
        image_generator = EventImageGenerator(event, filename=f"event_image_{i}.jpg")
        image_generator.generate(open_when_done=open_when_done)


if __name__ == "__main__":
    IntroImageGenerator().generate(open_when_done=True)
    generate_event_images(open_when_done=True)
