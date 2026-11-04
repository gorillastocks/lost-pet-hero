#!/usr/bin/env python3
"""Draw the app icon with the standard library. A cream paw and a heart on green."""
import struct
import zlib
from pathlib import Path


def chunk(tag, data):
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path, size, pixel):
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            raw.extend(pixel(x, y, size))
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b'')
    Path(path).write_bytes(png)


def icon(x, y, size):
    def blend(dst, src, a):
        return int(dst * (1 - a) + src * a)

    nx = (x + 0.5) / size - 0.5
    ny = (y + 0.5) / size - 0.5
    r = (nx * nx + ny * ny) ** 0.5
    if r > 0.48:
        return (20, 53, 36, 0)
    bg = (47, 125, 74, 255)
    # paw
    pads = [(-0.08, 0.06, 0.12), (-0.16, -0.1, 0.055), (0.0, -0.16, 0.055), (0.16, -0.1, 0.055)]
    cream = (255, 246, 228)
    for cx, cy, rad in pads:
        d = ((nx - cx) ** 2 + (ny - cy) ** 2) ** 0.5
        if d < rad:
            return (*cream, 255)
    # heart
    hx, hy = nx - 0.12, ny - 0.22
    heart = (hx * hx + hy * hy - 0.03) ** 3 - hx * hx * hy * hy * hy
    if heart < 0 and ny < 0.02:
        return (227, 107, 79, 255)
    edge = min(1, max(0, (0.48 - r) / 0.02))
    return tuple(blend(20, c, edge) if i < 3 else int(255 * edge) for i, c in enumerate(bg))


def main():
    root = Path(__file__).resolve().parents[1]
    out = root / 'public'
    for size, name in ((180, 'icon-180.png'), (192, 'icon-192.png'), (512, 'icon-512.png')):
        write_png(out / name, size, icon)
        print(name)
    ios_icon = root / 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
    if ios_icon.parent.exists():
        write_png(ios_icon, 1024, icon)
        print(ios_icon.name)


if __name__ == '__main__':
    main()
