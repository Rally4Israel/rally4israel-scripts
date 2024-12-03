from PIL import Image, ImageDraw, ImageFont
import textwrap
from dataclasses import dataclass


@dataclass
class Event:
    name: str
    date: str
    time: str
    location: str


class EventImageGenerator:
    calendar_icon = Image.open("img/icons/calendar.png")
    clock_icon = Image.open("img/icons/clock.png")
    map_pin_icon = Image.open("img/icons/map-pin.png")
    padding = 50

    def __init__(self, event):
        self.event = event
        self.width = self.height = 1080
        self.border_thickness = 15
        self.border_radius = 30
        self.background_color = (0, 92, 144)  # Blue
        self.border_color = (0, 0, 0)  # Black

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

    def generate(self):
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

        # Function to draw icons and corresponding text with proper alignment
        def draw_icon_and_text(icon, text, y_position, font, is_first_line=False):
            if icon:
                # Resize the icon to fit with the text
                icon_resized = icon.resize((40, 40))

                # Get the bounding box of the text to calculate its height
                text_bbox = draw.textbbox(
                    (self.padding + 50, y_position), text, font=font
                )
                text_height = text_bbox[3] - text_bbox[1]  # Height of the text box

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
                icon_offset += 10  # Move the icon down slightly for better alignment

                # Place icon and text on the image (only draw the icon if it's the first line)
                if is_first_line:
                    base.paste(
                        icon_resized,
                        (self.padding, y_position + icon_offset),
                        icon_resized,
                    )  # Place icon
                draw.text(
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
                text_bbox = draw.textbbox(
                    (self.padding + 50, y_position), text, font=font
                )
                text_height = text_bbox[3] - text_bbox[1]
                text_offset = text_height // 2

                # Place the text on the image
                draw.text(
                    (self.padding + 50, y_position + text_offset),
                    text,
                    font=font,
                    fill="white",
                )

                # Return the new y-position after drawing the text
                return y_position + text_height + 20

        # Wrap and draw the event name
        event_lines = self.wrap_text(self.event.name)
        y_position = self.padding

        for line in event_lines:
            y_position += 70  # Add some vertical space between lines

        # Draw the event date with calendar icon (only on the first line)
        y_position = draw_icon_and_text(
            self.calendar_icon,
            self.event.date,
            y_position,
            self.font_details,
            is_first_line=True,
        )

        # Draw the event time with clock icon (only on the first line)
        y_position = draw_icon_and_text(
            self.clock_icon,
            self.event.time,
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
            draw.text(
                (self.padding, y_position), line, font=self.font_event, fill="white"
            )
            y_position += 70  # Add some vertical space between lines

        # Redraw event date and time with icons
        y_position = draw_icon_and_text(
            self.calendar_icon,
            self.event.date,
            y_position,
            self.font_details,
            is_first_line=True,
        )
        y_position = draw_icon_and_text(
            self.clock_icon,
            self.event.time,
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
        base.save("event_image.png")

        # Show the image
        base.show()

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


# Sample event details
event = Event(
    name="Chicago (DePaul): Stop the Hate: Rally for Jewish Students",
    date="Thursday, Nov 21",
    time="5:00 pm",
    location=(
        "DePaul University - Lincoln Park Student Center, 2250 N. Sheffield Ave."
    ),
)

EventImageGenerator(event).generate()
