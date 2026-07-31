#!/usr/bin/env python3
"""Render a Cover Grid JSON project with real fonts at full resolution."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def draw_letterspaced(layer_image: Image.Image, layer: dict, font_path: Path) -> None:
    font = ImageFont.truetype(str(font_path), layer["fontSize"])
    if hasattr(font, "set_variation_by_name") and "Montserrat" in layer.get("fontFamily", ""):
        weight = layer.get("fontWeight", 400)
        variation = "Bold" if weight >= 700 else "Regular"
        font.set_variation_by_name(variation)
    text = layer["text"]
    spacing = layer.get("letterSpacing", 0)
    widths = [font.getlength(char) for char in text]
    raw_width = round(sum(widths) + max(0, len(text) - 1) * spacing)
    bbox = font.getbbox(text or " ")
    height = bbox[3] - bbox[1] + 20
    line = Image.new("RGBA", (max(1, raw_width + 40), max(1, height)), (0, 0, 0, 0))
    draw = ImageDraw.Draw(line)
    cursor = 20
    baseline_y = -bbox[1] + 10
    for char, width in zip(text, widths):
        draw.text((cursor, baseline_y), char, font=font, fill=layer["color"])
        cursor += width + spacing

    scale_x = layer.get("scaleX", 1)
    scaled_width = max(1, round(line.width * scale_x))
    if scaled_width != line.width:
        line = line.resize((scaled_width, line.height), Image.Resampling.LANCZOS)
    center_x = layer["x"] + layer.get("opticalX", 0)
    x = round(center_x - line.width / 2)
    y = round(layer["y"] - line.height / 2)
    layer_image.alpha_composite(line, (x, y))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("project", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    project = json.loads(args.project.read_text())
    root = args.project.parent.parent
    width = project["canvas"]["width"]
    height = project["canvas"]["height"]
    background = Image.open(root / project["background"]).convert("RGB").resize((width, height), Image.Resampling.LANCZOS)
    image = background.convert("RGBA")
    for layer in project["layers"]:
        if layer.get("visible", True):
            draw_letterspaced(image, layer, root / layer["fontFile"])

    args.output.parent.mkdir(parents=True, exist_ok=True)
    if args.output.suffix.lower() in {".jpg", ".jpeg"}:
        image.convert("RGB").save(args.output, quality=95, subsampling=0)
    else:
        image.save(args.output)


if __name__ == "__main__":
    main()
