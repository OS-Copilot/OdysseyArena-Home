"""Render the social card, public/social/og-image.png (1200x630).

    python3 tools/build_social.py

The card is an SVG written here (title, tagline, the mark and a row of bulbs on
the light theme's paper) and rasterised with rsvg-convert, so it needs librsvg
on PATH. Fonts fall back to the system sans; the page's web fonts are not
embedded.
"""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "social" / "og-image.png"
SVG = ROOT / "public" / "social" / "og-image.svg"

TEAL, AMBER, INK, DIM = "#1a9099", "#ef9d23", "#112120", "#586c6a"


def bulb(x, y, on, scale=1.0):
    glass = AMBER if on else "none"
    stroke = "#f3c56f" if on else "#9fb3b1"
    halo = f'<circle cx="{x}" cy="{y + 8}" r="30" fill="{AMBER}" opacity="0.25"/>' if on else ""
    return (f'<g transform="translate({x - 22},{y - 20}) scale({scale})">{halo}'
            f'<path d="M22 3C12 3 4.5 10.5 4.5 19.5c0 6.5 3.6 10.3 7.5 14.2V39h20v-5.3c3.9-3.9 7.5-7.7 7.5-14.2C39.5 10.5 32 3 22 3Z" '
            f'fill="{glass}" fill-opacity="0.85" stroke="{stroke}" stroke-width="2"/>'
            f'<rect x="13" y="40" width="18" height="6" rx="2" fill="#c9d4d2"/>'
            f'<rect x="16" y="47.5" width="12" height="4" rx="1.5" fill="#c9d4d2"/></g>')


def build():
    pattern = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1]
    bulbs = "".join(bulb(760 + i * 36, 470, b, 1.0) for i, b in enumerate(pattern))
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#eef7f6"/><stop offset="1" stop-color="#f6f3ea"/>
    </linearGradient>
    <radialGradient id="g1" cx="0.1" cy="0" r="0.7"><stop offset="0" stop-color="{TEAL}" stop-opacity="0.25"/><stop offset="1" stop-color="{TEAL}" stop-opacity="0"/></radialGradient>
    <radialGradient id="g2" cx="0.95" cy="0.05" r="0.6"><stop offset="0" stop-color="{AMBER}" stop-opacity="0.22"/><stop offset="1" stop-color="{AMBER}" stop-opacity="0"/></radialGradient>
    <linearGradient id="t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0e5b62"/><stop offset="0.6" stop-color="{TEAL}"/><stop offset="1" stop-color="{AMBER}"/></linearGradient>
    <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#2d403e" fill-opacity="0.16"/></pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#dots)"/>
  <rect width="1200" height="630" fill="url(#g1)"/>
  <rect width="1200" height="630" fill="url(#g2)"/>
  <g transform="translate(72,70) scale(1.4)">
    <circle cx="32" cy="32" r="25" fill="none" stroke="{TEAL}" stroke-width="5" stroke-linecap="round" stroke-dasharray="118 40" transform="rotate(-58 32 32)"/>
    <path d="M19 44 C 23 30, 33 42, 40 27" fill="none" stroke="{TEAL}" stroke-width="3.6" stroke-linecap="round" stroke-dasharray="0.5 6.5"/>
    <circle cx="43" cy="21" r="11" fill="{AMBER}" opacity="0.28"/><circle cx="43" cy="21" r="6.6" fill="{AMBER}"/>
  </g>
  <text x="72" y="262" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="92" font-weight="700" letter-spacing="-3" fill="url(#t)">OdysseyArena</text>
  <text x="74" y="322" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="34" font-weight="500" fill="{INK}">Benchmarking Large Language Models for</text>
  <text x="74" y="366" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="34" font-weight="500" fill="{INK}">Long-Horizon, Active and Inductive Interactions</text>
  <text x="74" y="440" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="24" fill="{DIM}">Environments whose rules are hidden. Agents must discover the dynamics</text>
  <text x="74" y="474" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="24" fill="{DIM}">through their own actions before they can plan.</text>
  <text x="74" y="560" font-family="Menlo, monospace" font-size="20" fill="{TEAL}">os-copilot.github.io/OdysseyArena-Home</text>
  <g transform="translate(-40,60)">{bulbs}</g>
</svg>'''
    SVG.write_text(svg)
    subprocess.run(["rsvg-convert", "-w", "1200", "-h", "630", "-o", str(OUT), str(SVG)], check=True)
    SVG.unlink()
    print(f"  wrote {OUT.relative_to(ROOT)} {OUT.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    build()
