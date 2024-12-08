from datetime import date, time
from PIL import Image, ImageDraw, ImageFont
import textwrap
import subprocess
import platform
from r4ilpy.events import Event, airtable_record_to_event
from r4ilpy.airtable import get_filtered_calendar_records
from pilmoji import Pilmoji
import os


class EventImageGenerator:
    padding = 5

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

    def generate(self, open_when_done=False):
        self.open_when_done = open_when_done
        base = self.create_base_image()
        draw = ImageDraw.Draw(base)

        # Draw the black border with rounded corners
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

        def pilmoji_draw(text, y_position, font):
            with Pilmoji(base) as pilmoji:
                # Just draw text if there's no icon
                text_bbox = pilmoji.getsize(text, font=font)
                text_height = text_bbox[1]
                text_offset = text_height // 2

                # Place the text on the image
                pilmoji.text(
                    (self.padding + 50, y_position + text_offset),
                    text,
                    font=font,
                    fill="white",
                )

                # Return the new y-position after drawing the text
                return y_position + text_height + 20

        # Wrap and draw the event name
        event_lines = self.wrap_text(self.event.title)
        y_position = self.padding

        for line in event_lines:
            y_position += 70  # Add some vertical space between lines

        # Draw the event date
        y_position = pilmoji_draw(
            f"🗓️ {self.formatted_date}",
            y_position,
            self.font_details,
        )
        # Draw the event time
        y_position = pilmoji_draw(
            f"⏰ {self.formatted_start_time}",
            y_position,
            self.font_details,
        )

        # Wrap and draw the event location (fix the wrapping for longer location)
        location_lines = self.wrap_text(self.event.location)

        for i, line in enumerate(location_lines):
            # For location, only show the map pin icon on the first line
            if i == 0:
                # Draw the map pin icon and the first line of location
                y_position = pilmoji_draw(f"📌 {line}", y_position, self.font_details)
            else:
                y_position = pilmoji_draw(line, y_position, self.font_details)

        # Calculate total content height to center the text
        total_content_height = y_position - self.padding

        # Calculate the starting Y position to center the content vertically
        y_position_offset = (
            self.height - total_content_height
        ) // 2 - 70  # Fine-tuned the offset value by -15

        # Create the final image with the vertical offset applied
        base = Image.new(
            "RGB",
            (
                self.width + 2 * self.border_thickness,
                self.height + 2 * self.border_thickness,
            ),
            self.background_color,
        )
        draw = ImageDraw.Draw(base)

        # Redraw the border
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

        # Re-initialize y_position with the vertical offset applied
        y_position = (
            self.padding + y_position_offset
        )  # Apply the offset for vertical centering

        # Redraw event name
        for line in event_lines:
            y_position = pilmoji_draw(line, y_position, self.font_event)

        # Redraw event date and time
        y_position = pilmoji_draw(
            f"🗓️ {self.formatted_date}",
            y_position,
            self.font_details,
        )
        y_position = pilmoji_draw(
            f"⏰ {self.formatted_start_time}",
            y_position,
            self.font_details,
        )

        # Redraw the event location
        for i, line in enumerate(location_lines):
            if i == 0:
                y_position = pilmoji_draw(
                    f"📌 {line}",
                    y_position,
                    self.font_details,
                )
            else:
                if i == 1:
                    y_position = pilmoji_draw(line, y_position, self.font_details)
                else:
                    y_position = pilmoji_draw(line, y_position, self.font_details)

        # Ensure the directory for the image exists
        os.makedirs(os.path.dirname(self.filename), exist_ok=True)
        # Save the image
        base.save(self.filename)

        # Show the image
        if self.open_when_done:
            self.open()

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

    def load_fonts(self):
        try:
            # Path to the fonts directory
            font_dir = os.path.join(os.path.dirname(__file__), "../fonts")
            # Regular text font
            self.font_event = ImageFont.truetype(
                os.path.join(font_dir, "NotoSans-Bold.ttf"), 50
            )
            self.font_details = ImageFont.truetype(
                os.path.join(font_dir, "NotoSans-Regular.ttf"), 45
            )
        except OSError:
            print("Font not found, using default font.")
            self.font_event = self.font_details = ImageFont.load_default()


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
