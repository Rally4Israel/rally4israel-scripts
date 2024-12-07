from datetime import date, time
from PIL import Image, ImageDraw, ImageFont
import textwrap
import subprocess
import platform
from r4ilpy.events import Event, airtable_record_to_event
from r4ilpy.airtable import get_filtered_calendar_records
from pilmoji import Pilmoji
import emoji


class EventImageGenerator:
    calendar_icon = Image.open("img/icons/calendar.png")
    clock_icon = Image.open("img/icons/clock.png")
    map_pin_icon = Image.open("img/icons/map-pin.png")
    padding = 50

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

        def extract_emojis(text):
            return [char if char in emoji.EMOJI_DATA else char for char in text]

        # Replace emojis with Twemoji PNGs
        def draw_text_with_emojis(draw, text, position, font, emoji_size=32):
            x, y = position
            for char in extract_emojis(text):
                if char in emoji.EMOJI_DATA:
                    emoji_path = (
                        f"twemoji/{ord(char):x}.png"  # Assuming Twemoji PNGs are stored
                    )
                    emoji_img = Image.open(emoji_path).resize((emoji_size, emoji_size))
                    img.paste(emoji_img, (x, y))
                    x += emoji_size
                else:
                    char_width, char_height = draw.textsize(char, font=font)
                    draw.text((x, y), char, font=font, fill="black")
                    x += char_width

        # Function to draw icons and corresponding text with proper alignment
        def draw_icon_and_text(icon, text, y_position, font, is_first_line=False):
            with Pilmoji(base) as pilmoji:
                if icon:
                    # Resize the icon to fit with the text
                    icon_resized = icon.resize((40, 40))

                    # Get the bounding box of the text to calculate its height
                    text_bbox = pilmoji.getsize(text, font=font)
                    text_height = text_bbox[1]  # Height of the text box

                    # Calculate the total height that will be occupied by the icon and the text
                    total_height = max(icon_resized.height, text_height)

                    # Calculate y-position adjustments so both the icon and text are vertically centered
                    icon_offset = (
                        total_height - icon_resized.height
                    ) // 2  # Center the icon vertically
                    text_offset = (
                        total_height - text_height
                    ) // 2  # Center the text vertically

                    # Lower the icon position by a fixed amount (if necessary)
                    icon_offset += (
                        10  # Move the icon down slightly for better alignment
                    )

                    # Place icon and text on the image (only draw the icon if it's the first line)
                    if is_first_line:
                        base.paste(
                            icon_resized,
                            (self.padding, y_position + icon_offset),
                            icon_resized,
                        )  # Place icon
                    pilmoji.text(
                        (
                            self.padding + (50 if is_first_line else 0),
                            y_position + text_offset,
                        ),
                        text,
                        font=font,
                        fill="white",
                    )  # Place text

                    # Return the new y-position after drawing the icon and text
                    return (
                        y_position + total_height + 20
                    )  # Add some space for the next section
                else:
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

        # Draw the event date with calendar icon (only on the first line)
        y_position = draw_icon_and_text(
            self.calendar_icon,
            self.formatted_date,
            y_position,
            self.font_details,
            is_first_line=True,
        )

        # Draw the event time with clock icon (only on the first line)
        y_position = draw_icon_and_text(
            self.clock_icon,
            self.formatted_start_time,
            y_position,
            self.font_details,
            is_first_line=True,
        )

        # Wrap and draw the event location (fix the wrapping for longer location)
        location_lines = self.wrap_text(self.event.location)

        # Adjust the spacing between the first and second lines of location with this variable
        space_between_first_and_second_line = -20  # This is the value to adjust only the space between the first and second location lines

        for i, line in enumerate(location_lines):
            # For location, only show the map pin icon on the first line
            if i == 0:
                # Draw the map pin icon and the first line of location
                y_position = draw_icon_and_text(
                    self.map_pin_icon,
                    line,
                    y_position,
                    self.font_details,
                    is_first_line=True,
                )
            else:
                # For the second line and beyond, don't show the map pin and add reduced space only between the first and second line
                if i == 1:
                    y_position = draw_icon_and_text(
                        None,
                        line,
                        y_position + space_between_first_and_second_line,
                        self.font_details,
                        is_first_line=False,
                    )
                else:
                    y_position = draw_icon_and_text(
                        None, line, y_position, self.font_details, is_first_line=False
                    )

        # Calculate total content height to center the text
        total_content_height = (
            y_position - self.padding
        )  # The total height of the content

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
            with Pilmoji(base) as pilmoji:
                pilmoji.text(
                    (self.padding, y_position), line, font=self.font_event, fill="white"
                )
            y_position += 70  # Add some vertical space between lines

        # Redraw event date and time with icons
        y_position = draw_icon_and_text(
            self.calendar_icon,
            self.formatted_date,
            y_position,
            self.font_details,
            is_first_line=True,
        )
        y_position = draw_icon_and_text(
            self.clock_icon,
            self.formatted_start_time,
            y_position,
            self.font_details,
            is_first_line=True,
        )

        # Redraw the event location
        for i, line in enumerate(location_lines):
            if i == 0:
                y_position = draw_icon_and_text(
                    self.map_pin_icon,
                    line,
                    y_position,
                    self.font_details,
                    is_first_line=True,
                )
            else:
                if i == 1:
                    y_position = draw_icon_and_text(
                        None,
                        line,
                        y_position + space_between_first_and_second_line,
                        self.font_details,
                        is_first_line=False,
                    )
                else:
                    y_position = draw_icon_and_text(
                        None, line, y_position, self.font_details, is_first_line=False
                    )

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
            # Regular text font
            self.font_event = ImageFont.truetype(
                "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf", 50
            )
            self.font_details = ImageFont.truetype(
                "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf", 45
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


def generate_event_images():
    for i, record in enumerate(get_filtered_calendar_records()):
        event = airtable_record_to_event(record)
        image_generator = EventImageGenerator(event, filename=f"event_image_{i}.jpg")
        image_generator.generate(open_when_done=True)


if __name__ == "__main__":
    generate_event_images()
