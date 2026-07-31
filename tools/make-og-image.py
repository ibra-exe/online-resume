#!/usr/bin/env python3
"""Rebuild files/og-image.jpg with the circuit backdrop instead of the starfield.

The brief was "keep the exact same style, only replace the stars", and the
original's fonts (Orbitron, Chakra Petch) are not installed here and no generator
script survives — so redrawing the text was never an option. Instead this keeps
the original's foreground pixels bit for bit and swaps only what sits behind them:

    background estimate   min-filter the original -> the wash with the stars,
                          the text and the border hairline all eaten away
    residual              original - background, carried with a +128 offset so
                          negatives survive. This IS the foreground: text, glow,
                          border hairline, and the stars.
    star removal          neutralise the residual inside the star regions only,
                          so those pixels fall back to plain background
    new background        background estimate + trace grid + pixel lattice
    result                new background + residual

Because the residual is added back verbatim, every letter and its glow come out
pixel-identical to the original, and the border hairline is preserved for free
without having to redraw it. The grid ends up *under* the text, which is where it
sits on the site.

Stars are identified by position, not size: the tagline's letters are 80-270px
each, the same order as a glowing star's core, and one star sits on the tagline's
own baseline. Component pitch settles it — the letters run at a 21-23px pitch and
stop at x=859, then there is a 103px gap before the blob at (962,473).
"""
import os
import sys
from collections import deque
from PIL import Image, ImageChops, ImageDraw, ImageFilter

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + "/"
SRC = REPO + "files/og-image.jpg"            # the starfield original, kept as the source
OUT = REPO + "files/og-image-circuit.jpg"    # what the meta tags point at
CMP = sys.argv[1] if len(sys.argv) > 1 else None   # optional side-by-side for review

# Regions the original's own components fall into. Anything bright outside all of
# these is a star. Taken from the measured component boxes, padded a little.
TEXT_REGIONS = [
    (380, 135, 810, 315),   # the Ibra wordmark, one 48,902px component
    (270, 330, 925, 400),   # TECHNOLOGY
    (450, 420, 745, 440),   # the divider rule
    (315, 455, 880, 495),   # the tagline, which ends at x=859
]

GRID = 60          # px between trace lines, as on the site
STEP = 60          # px between lattice cells, one per grid square, as on the site
SIZE = 16          # px of a cell
INSET = 22         # (STEP - SIZE) / 2, so the cell sits centred in its square
LINE_A = 0.075     # trace line alpha
PEAK_MIN, PEAK_MAX = 0.12, 0.30   # per-cell alpha range, as on the site
VIOLET = (183, 102, 255)

im = Image.open(SRC).convert("RGB")
W, H = im.size

# ---- background estimate --------------------------------------------------
SCALE = 4
small = im.resize((W // SCALE, H // SCALE), Image.BOX)
bg = (small.filter(ImageFilter.MinFilter(15))
           .filter(ImageFilter.GaussianBlur(6))
           .resize((W, H), Image.BICUBIC))

# ---- find the bright components ------------------------------------------
px, bx = im.load(), bg.load()
lum = lambda p: (p[0] * 299 + p[1] * 587 + p[2] * 114) // 1000

THRESH = 18
mask = bytearray(W * H)
for y in range(H):
    row = y * W
    for x in range(W):
        if lum(px[x, y]) - lum(bx[x, y]) > THRESH:
            mask[row + x] = 1

seen = bytearray(W * H)
comps = []
for y in range(H):
    for x in range(W):
        i = y * W + x
        if not mask[i] or seen[i]:
            continue
        q = deque([(x, y)])
        seen[i] = 1
        x0 = x1 = x
        y0 = y1 = y
        n = 0
        while q:
            cx, cy = q.popleft()
            n += 1
            x0, x1 = min(x0, cx), max(x1, cx)
            y0, y1 = min(y0, cy), max(y1, cy)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < W and 0 <= ny < H:
                        j = ny * W + nx
                        if mask[j] and not seen[j]:
                            seen[j] = 1
                            q.append((nx, ny))
        comps.append((n, x0, y0, x1, y1))


# The frame's four straight sides come out as long components, but its rounded
# corners break off as small separate blobs that a size test happily mistakes for
# stars — erasing them punches visible gaps in the frame. The frame sits at
# x 26..1173, y 26..603 (measured), so guard a box around each of its corners.
FRAME = (26, 26, 1173, 603)
CORNER = 40
CORNERS = [(FRAME[0], FRAME[1]), (FRAME[2], FRAME[1]),
           (FRAME[0], FRAME[3]), (FRAME[2], FRAME[3])]


def classify(c):
    n, x0, y0, x1, y1 = c
    w, h = x1 - x0 + 1, y1 - y0 + 1
    if w > 900 or h > 500:
        return "border"
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    for fx, fy in CORNERS:
        if abs(cx - fx) <= CORNER and abs(cy - fy) <= CORNER:
            return "border"
    for rx0, ry0, rx1, ry1 in TEXT_REGIONS:
        if rx0 <= cx <= rx1 and ry0 <= cy <= ry1:
            return "text"
    return "star"


kinds = {}
for c in comps:
    kinds.setdefault(classify(c), []).append(c)

print(f"{len(comps)} components: "
      + ", ".join(f"{k}={len(v)}" for k, v in sorted(kinds.items())))
print("\nremoving these as stars:")
for n, x0, y0, x1, y1 in sorted(kinds.get("star", []), reverse=True):
    print(f"  area={n:5d}  centre ({(x0+x1)//2:4d},{(y0+y1)//2:4d})  "
          f"box x {x0:4d}-{x1:4d} y {y0:4d}-{y1:4d}")

assert kinds.get("text"), "no text components found — the regions must be wrong"
assert len(kinds.get("text", [])) >= 30, \
    f"only {len(kinds.get('text', []))} text components; expected the wordmark, " \
    "TECHNOLOGY, the rule and ~25 tagline letters"

# ---- star mask -----------------------------------------------------------
# Generous discs, because a glowing star's visible halo reaches well past the
# part that clears the threshold. Blurred afterwards so it blends rather than
# leaving a hard rim.
star_mask = Image.new("L", (W, H), 0)
sd = ImageDraw.Draw(star_mask)
for n, x0, y0, x1, y1 in kinds.get("star", []):
    pad = 34 if n >= 150 else (20 if n >= 30 else 12)
    sd.ellipse([x0 - pad, y0 - pad, x1 + pad, y1 + pad], fill=255)
star_mask = star_mask.filter(ImageFilter.GaussianBlur(9))

# ---- the circuit layer ---------------------------------------------------
circuit = Image.new("RGB", (W, H), (0, 0, 0))
cd = ImageDraw.Draw(circuit)


def blend(alpha):
    """Violet at `alpha` over black, i.e. what gets added to the background."""
    return tuple(int(round(c * alpha)) for c in VIOLET)


line_rgb = blend(LINE_A)
for gx in range(0, W, GRID):
    cd.line([(gx, 0), (gx, H)], fill=line_rgb)
for gy in range(0, H, GRID):
    cd.line([(0, gy), (W, gy)], fill=line_rgb)


def cell_alpha(i, j):
    """Deterministic per-cell brightness — a frozen frame of the live lattice."""
    v = (i * 73856093) ^ (j * 19349663)
    v = (v * 2654435761) & 0xFFFFFFFF
    frac = ((v >> 8) & 0xFFFF) / 0xFFFF
    lit = (((v >> 24) & 0xFF) / 0xFF)
    # ~30% lit, which is what the live lattice measures at any one instant.
    # 42% read busier than the site does.
    if lit > 0.30:
        return 0.0
    return PEAK_MIN + frac * (PEAK_MAX - PEAK_MIN)


cols, rows = W // STEP + 1, H // STEP + 1
lit_cells = 0
for j in range(rows):
    for i in range(cols):
        a = cell_alpha(i, j)
        if a <= 0:
            continue
        lit_cells += 1
        x, y = i * STEP + INSET, j * STEP + INSET
        cd.rectangle([x, y, x + SIZE - 1, y + SIZE - 1], fill=blend(a))
print(f"\nlattice: {lit_cells} lit cells of {cols * rows}")

# Keep the circuit inside the border frame, and fade it towards the edges the way
# the site's radial mask does, so it reads as a lit board rather than graph paper.
frame = Image.new("L", (W, H), 0)
ImageDraw.Draw(frame).rounded_rectangle([28, 28, W - 30, H - 30], radius=18, fill=255)
vign = Image.new("L", (W, H), 0)
vd = ImageDraw.Draw(vign)
steps = 90
for k in range(steps, 0, -1):
    t = k / steps
    val = int(255 * (1.0 - t ** 2) ** 0.65)
    vd.ellipse([W / 2 - (W * 0.78) * t, H / 2 - (H * 0.95) * t,
                W / 2 + (W * 0.78) * t, H / 2 + (H * 0.95) * t], fill=val)
vign = vign.filter(ImageFilter.GaussianBlur(24))
circuit_mask = ImageChops.multiply(frame, vign)

# ---- assemble ------------------------------------------------------------
# Swap the stars for plain background first. Done as a straight composite rather
# than by neutralising a +128-offset residual: white text sits ~190 above the wash,
# which overflows a signed byte, and clipping it at 127 visibly washed out every
# bright pixel of the wordmark. This way the foreground is never round-tripped.
starless = Image.composite(bg, im, star_mask)

# Hold the circuit out of the foreground. Without this the grid is added over
# everything, so lattice squares land *on* the letters as lighter blocks instead of
# passing behind them. The gap between the starless image and the background is the
# foreground's own opacity: ~255 on a solid glyph, tens in the glow, ~0 on empty
# background. Gained up so the glow masks the grid too, not just the letter bodies.
# Measured after star removal, so the erased stars do not leave circuit-free discs.
foreground = ImageChops.subtract(starless, bg).convert("L").point(
    lambda v: min(255, int(v * 1.7)))
circuit_mask = ImageChops.multiply(circuit_mask, ImageChops.invert(foreground))
circuit = Image.composite(circuit, Image.new("RGB", (W, H), (0, 0, 0)), circuit_mask)

out = ImageChops.add(starless, circuit)

out.save(OUT, "JPEG", quality=92, optimize=True, progressive=False)
print(f"\nwrote {OUT}  ({os.path.getsize(OUT) / 1024:.1f} KB, "
      f"original {os.path.getsize(SRC) / 1024:.1f} KB)")

# Optional side-by-side, so the swap can be judged rather than taken on trust.
# Written only where asked, to keep build artefacts out of the served directory.
if CMP:
    side = Image.new("RGB", (W, H * 2 + 12), (0, 0, 0))
    side.paste(im, (0, 0))
    side.paste(out, (0, H + 12))
    side.save(CMP, "JPEG", quality=90)
    print(f"wrote {CMP} (original on top, new below)")
