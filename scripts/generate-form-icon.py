"""Render the Forum mark to full-bleed PNGs for the web app manifest."""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / "browser-public"
BACKGROUND = "#254e3b"
FOREGROUND = "#f6f7ea"
ACCENT = "#bfd193"
BARS = [(152, 143, 187, 369), (152, 143, 346, 178), (152, 222, 297, 257)]
DOT = (331, 345, 18)

shapes = [f'<rect width="512" height="512" fill="{BACKGROUND}"/>']
for left, top, right, bottom in BARS:
    shapes.append(
        f'<rect x="{left}" y="{top}" width="{right-left}" height="{bottom-top}" rx="17.5" fill="{FOREGROUND}"/>'
    )
x, y, radius = DOT
shapes.append(f'<circle cx="{x}" cy="{y}" r="{radius}" fill="{ACCENT}"/>')
(ROOT / "favicon.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">\n  '
    + "\n  ".join(shapes) + "\n</svg>\n"
)

scale = 4
image = Image.new("RGB", (512 * scale, 512 * scale), BACKGROUND)
draw = ImageDraw.Draw(image)
for bounds in BARS:
    draw.rounded_rectangle(tuple(value * scale for value in bounds), radius=70, fill=FOREGROUND)
draw.ellipse(tuple(value * scale for value in (x-radius, y-radius, x+radius, y+radius)), fill=ACCENT)
for size in (192, 512):
    image.resize((size, size), Image.Resampling.LANCZOS).save(ROOT / f"icon-{size}.png")
