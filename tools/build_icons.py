"""Rebuild every image derived from the OdysseyArena mark.

Run after editing public/logo.svg:

    python3 tools/build_icons.py

Writes  public/logo.png             512 px, the mark on a transparent square
        public/favicon-{16,32,512}.png
        public/favicon.ico          16, 32, 48 and 64 px
        public/apple-touch-icon.png 180x180, opaque (iOS turns transparency black)
Needs rsvg-convert (librsvg) on PATH and Pillow.
"""
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
SVG = PUBLIC / "logo.svg"
BG = (244, 247, 246)  # --bg of the light theme


def render(px):
    out = PUBLIC / "logo.png"
    subprocess.run(["rsvg-convert", "-w", str(px), "-h", str(px), "-o", str(out), str(SVG)], check=True)
    return Image.open(out).convert("RGBA")


def build():
    logo = render(512)
    logo.save(PUBLIC / "logo.png", optimize=True)
    for px in (16, 32, 512):
        out = logo.resize((px, px), Image.LANCZOS)
        if px == 512:
            out = out.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
        out.save(PUBLIC / f"favicon-{px}.png", optimize=True)
    logo.save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

    touch = Image.new("RGBA", (180, 180), BG + (255,))
    mark = logo.resize((150, 150), Image.LANCZOS)
    touch.alpha_composite(mark, (15, 15))
    touch.convert("RGB").save(PUBLIC / "apple-touch-icon.png", optimize=True)

    for name in ("logo.png", "favicon-16.png", "favicon-32.png", "favicon-512.png", "favicon.ico", "apple-touch-icon.png"):
        print(f"  wrote public/{name:22s} {(PUBLIC / name).stat().st_size / 1024:7.1f} KB")


if __name__ == "__main__":
    build()
