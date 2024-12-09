from datetime import date, time, datetime
from PIL import Image, ImageDraw, ImageFont
import textwrap
import subprocess
import platform
from r4ilpy.events import Event, airtable_record_to_event
from r4ilpy.airtable import get_filtered_calendar_records
from pilmoji import Pilmoji
import emoji
import os


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

    def generate(self, open_when_done=False):
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

        # Prepare content
        title_lines = self.wrap_text(self.event.title, max_chars=36)
        y_position = 300

        # Draw content
        with Pilmoji(base) as pilmoji:
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
    generate_event_images(open_when_done=True)
