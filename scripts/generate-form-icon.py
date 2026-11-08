"""Generate the full-bleed, mask-safe Form home-screen icons."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / "browser-public"
GREEN = "#254e3b"
IVORY = "#edf2d0"
SAGE = "#a5bb78"


def cubic(start, first, second, end, steps=80):
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        yield (
            u**3 * start[0] + 3 * u**2 * t * first[0] + 3 * u * t**2 * second[0] + t**3 * end[0],
            u**3 * start[1] + 3 * u**2 * t * first[1] + 3 * u * t**2 * second[1] + t**3 * end[1],
        )


def icon(size):
    scale = 4
    image = Image.new("RGB", (512 * scale, 512 * scale), GREEN)
    draw = ImageDraw.Draw(image)
    points = list(cubic((310, 150), (268, 136), (230, 157), (230, 201)))
    points.append((230, 358))
    points = [(round(x * scale), round(y * scale)) for x, y in points]
    width = 43 * scale
    draw.line(points, fill=IVORY, width=width, joint="curve")
    for x, y in (points[0], points[-1]):
        draw.ellipse((x - width//2, y - width//2, x + width//2, y + width//2), fill=IVORY)
    draw.line(((176 * scale, 235 * scale), (305 * scale, 235 * scale)), fill=IVORY, width=width)
    for x in (176, 305):
        draw.ellipse(((x-21.5)*scale, 213.5*scale, (x+21.5)*scale, 256.5*scale), fill=IVORY)
    draw.ellipse((313*scale, 336*scale, 355*scale, 378*scale), fill=SAGE)
    image.resize((size, size), Image.Resampling.LANCZOS).save(ROOT / f"icon-{size}.png", optimize=True)


for size in (192, 512):
    icon(size)
