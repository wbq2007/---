#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Print image type and dimensions for a JPEG/PNG/WebP file. Stdlib only.
Usage: python -I imginfo.py <path>
"""
import struct
import sys


def jpeg_size(data):
    if data[:2] != b"\xff\xd8":
        return None
    i = 2
    while i < len(data) - 9:
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
            i += 2
            continue
        seglen = struct.unpack(">H", data[i + 2 : i + 4])[0]
        if marker in (0xC0, 0xC1, 0xC2, 0xC5, 0xC6, 0xC9, 0xCA, 0xCD, 0xCE):
            h, w = struct.unpack(">HH", data[i + 5 : i + 9])
            return ("JPEG", w, h)
        i += 2 + seglen
    return None


def png_size(data):
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    w, h = struct.unpack(">II", data[16:24])
    return ("PNG", w, h)


def webp_size(data):
    if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return None
    fmt = data[12:16]
    if fmt == b"VP8 ":
        w, h = struct.unpack("<HH", data[26:30])
        return ("WebP", w & 0x3FFF, h & 0x3FFF)
    if fmt == b"VP8L":
        b = data[21:25]
        w = ((b[1] & 0x3F) << 8 | b[0]) + 1
        h = ((b[3] & 0x0F) << 10 | b[2] << 2 | (b[1] & 0xC0) >> 6) + 1
        return ("WebP", w, h)
    if fmt == b"VP8X":
        w = (data[24] | data[25] << 8 | data[26] << 16) + 1
        h = (data[27] | data[28] << 8 | data[29] << 16) + 1
        return ("WebP", w, h)
    return None


def main(path):
    with open(path, "rb") as f:
        data = f.read(1 << 20)
    for fn in (jpeg_size, png_size, webp_size):
        r = fn(data)
        if r:
            print("%s %dx%d" % r)
            return
    print("UNKNOWN")


if __name__ == "__main__":
    main(sys.argv[1])
