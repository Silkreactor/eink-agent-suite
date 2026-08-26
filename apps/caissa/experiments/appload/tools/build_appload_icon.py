#!/usr/bin/env python3
"""Build the dependency-free Caissa AppLoad launcher icon."""

from __future__ import annotations

import binascii
import pathlib
import struct
import zlib


SIZE = 256
APPLOAD_DIR = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = APPLOAD_DIR / "icon.png"


def paint(pixels: list[list[tuple[int, int, int]]], left: int, top: int, width: int,
          height: int, color: tuple[int, int, int]) -> None:
    for y in range(max(0, top), min(SIZE, top + height)):
        for x in range(max(0, left), min(SIZE, left + width)):
            pixels[y][x] = color


def png_chunk(kind: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + kind
        + data
        + struct.pack(">I", binascii.crc32(kind + data) & 0xFFFFFFFF)
    )


def main() -> None:
    white = (247, 247, 242)
    black = (20, 20, 20)
    mid = (158, 158, 150)
    pixels = [[white for _ in range(SIZE)] for _ in range(SIZE)]

    paint(pixels, 12, 12, 232, 232, black)
    cell = 54
    for row in range(4):
        for column in range(4):
            color = white if (row + column) % 2 == 0 else mid
            paint(pixels, 20 + column * cell, 20 + row * cell, cell, cell, color)

    # A bold pixel C remains legible on a small monochrome launcher tile.
    glyph = (
        "11111",
        "10000",
        "10000",
        "10000",
        "10000",
        "10000",
        "11111",
    )
    scale = 22
    glyph_left = (SIZE - len(glyph[0]) * scale) // 2
    glyph_top = (SIZE - len(glyph) * scale) // 2
    for row, line in enumerate(glyph):
        for column, bit in enumerate(line):
            if bit == "1":
                paint(
                    pixels,
                    glyph_left + column * scale,
                    glyph_top + row * scale,
                    scale,
                    scale,
                    black,
                )

    raw = b"".join(b"\x00" + bytes(channel for pixel in row for channel in pixel) for row in pixels)
    png = b"\x89PNG\r\n\x1a\n"
    png += png_chunk(b"IHDR", struct.pack(">IIBBBBB", SIZE, SIZE, 8, 2, 0, 0, 0))
    png += png_chunk(b"IDAT", zlib.compress(raw, 9))
    png += png_chunk(b"IEND", b"")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_bytes(png)
    print(OUTPUT)


if __name__ == "__main__":
    main()
