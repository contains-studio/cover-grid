#!/usr/bin/env python3
"""Deterministically remove dark text from known cover regions.

This is a migration helper for legacy flattened artwork. New covers should start
with a clean background and use Cover Grid's real text layers.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageFilter


def parse_box(value: str) -> tuple[int, int, int, int]:
    parts = tuple(int(part) for part in value.split(","))
    if len(parts) != 4:
        raise argparse.ArgumentTypeError("box must be x0,y0,x1,y1")
    return parts


def text_mask(
    image: Image.Image,
    boxes: list[tuple[int, int, int, int]],
    full_box: bool = False,
) -> Image.Image:
    rgb = image.convert("RGB")
    px = rgb.load()
    mask = Image.new("L", image.size, 0)
    mp = mask.load()
    for x0, y0, x1, y1 in boxes:
        for y in range(max(0, y0), min(image.height, y1)):
            for x in range(max(0, x0), min(image.width, x1)):
                if full_box:
                    mp[x, y] = 255
                    continue
                r, g, b = px[x, y]
                # The cover lettering is deep navy. This avoids mountains/city
                # because the boxes are tightly scoped around the typography.
                if b < 105 and r < 80 and g < 110 and b > r:
                    mp[x, y] = 255
    return mask.filter(ImageFilter.MaxFilter(9))


def vertical_heal(image: Image.Image, mask: Image.Image) -> Image.Image:
    src = image.convert("RGB")
    out = src.copy()
    sp = src.load()
    op = out.load()
    mp = mask.load()
    width, height = image.size

    for x in range(width):
        y = 0
        while y < height:
            if mp[x, y] == 0:
                y += 1
                continue
            start = y
            while y < height and mp[x, y] != 0:
                y += 1
            end = y - 1
            top = max(0, start - 1)
            bottom = min(height - 1, end + 1)
            top_color = sp[x, top]
            bottom_color = sp[x, bottom]
            span = max(1, bottom - top)
            for yy in range(start, end + 1):
                t = (yy - top) / span
                op[x, yy] = tuple(
                    round(top_color[channel] * (1 - t) + bottom_color[channel] * t)
                    for channel in range(3)
                )

    # Feather only the repaired pixels so the untouched background stays exact.
    softened = out.filter(ImageFilter.GaussianBlur(2.2))
    feather = mask.filter(ImageFilter.GaussianBlur(3.0))
    return Image.composite(softened, src, feather)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--box", action="append", type=parse_box, required=True)
    parser.add_argument(
        "--full-box",
        action="store_true",
        help="heal the complete rectangles instead of color-selected pixels",
    )
    args = parser.parse_args()

    image = Image.open(args.input).convert("RGB")
    mask = text_mask(image, args.box, args.full_box)
    healed = vertical_heal(image, mask)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    healed.save(args.output, quality=96)


if __name__ == "__main__":
    main()
