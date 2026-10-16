"""
Skyrealm art pipeline.

Reads the original green-screen art in art/source and writes finished,
transparent, game-ready webp files to public/assets. Run from the repo root:

    python scripts/art/build_art.py            # everything
    python scripts/art/build_art.py bosses env # just some groups

What it does, per the "Skyrealm Storybook" style guide (art/STYLE.md):
  * soft chroma key with despill, so edges carry no green fringe
  * trims every sprite and re-centres it at a shared fill ratio, so on-screen
    scale is consistent across the cast (the engine assumes ~88% fill)
  * one outline colour and a thickness tied to output size for every sprite
  * bosses are pushed toward the cel look and given an element-coloured rim
  * real pose variants (hit / attack / ability / death) instead of copies
  * environments become seamless vertical loops, toned down so gameplay pops,
    with painted cloud layers that keep to the screen edges
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "art" / "source"
OUT = ROOT / "public" / "assets"

PLUM = (42, 24, 56)
HOSTILE = (255, 70, 92)

ELEMENT = {
    "fire": (255, 107, 74),
    "water": (61, 240, 255),
    "nature": (125, 255, 154),
    "shadow": (138, 125, 255),
    "light": (255, 224, 138),
    "arcane": (255, 122, 217),
}

GUARDIAN_GLOW = {
    "aurelia": (255, 210, 74),
    "kairo": (61, 240, 255),
    "nyxara": (196, 107, 255),
    "elara": (125, 255, 154),
    "orion": (255, 122, 217),
    "vesper": (179, 136, 255),
}

BOSS_ELEMENT = {
    "iron_hydra": "nature",
    "ember_queen": "fire",
    "void_behemoth": "shadow",
    "frost_titan": "water",
    "shadow_serpent": "shadow",
    "storm_colossus": "light",
    "crystal_warden": "arcane",
    "dawn_sphinx": "light",
    "ruin_knight": "arcane",
    "aether_wyrm": "arcane",
}

SPECIES_ELEMENT = {
    "flicker": "fire", "cinder": "fire", "pyreling": "fire", "flamefox": "fire", "emberbat": "fire",
    "tidecurl": "water", "brine": "water", "ripple": "water", "aquamanta": "water", "frostlynx": "water",
    "sprout": "nature", "bramble": "nature", "mosskin": "nature", "mossling": "nature", "thornback": "nature",
    "gloom": "shadow", "duskwisp": "shadow", "nightmoth": "shadow", "shadowcub": "shadow", "moonowl": "shadow",
    "voidpup": "shadow",
    "lumen": "light", "halo": "light", "glimmer": "light", "stormwing": "light", "solarhare": "light",
    "hexling": "arcane", "prismite": "arcane", "echo": "arcane", "crystserpent": "arcane",
}

# Source crops for art whose file holds more than the one character.
CROPS = {
    "aetherlings/crystserpent_idle.webp": (250, 200, 384, 384),
}


# --------------------------------------------------------------------------- io


def load(rel: str) -> np.ndarray:
    im = Image.open(SRC / rel).convert("RGBA")
    if rel in CROPS:
        im = im.crop(CROPS[rel])
    return np.asarray(im).astype(np.float32)


def save(arr: np.ndarray, rel: str, quality: int = 74) -> None:
    dest = OUT / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")
    im.save(dest, "WEBP", quality=quality, alpha_quality=72, method=6)


def save_rgb(arr: np.ndarray, rel: str, quality: int = 80) -> None:
    dest = OUT / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB").save(dest, "WEBP", quality=quality, method=6)


# ------------------------------------------------------------------- keying


def key_green(a: np.ndarray) -> np.ndarray:
    """Soft key: hard screen-green goes clear, a thin band around it is
    feathered by how green it is, and that band is despilled."""
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    mx = np.maximum(r, b)
    spill = g - mx
    screen = (g >= 120) & (spill >= 50) & (g > mx * 1.35)
    if screen.sum() < 20:
        return a.copy()
    # Measure against the backdrop actually used in this file, so green
    # subjects (leaves, slime) survive: only near-exact matches key anywhere,
    # looser matches only where they connect to the border.
    edge = np.concatenate([a[0, :, :3], a[-1, :, :3], a[:, 0, :3], a[:, -1, :3]])
    edge = edge[(edge[:, 1] - np.maximum(edge[:, 0], edge[:, 2])) > 50]
    bgc = np.median(edge, axis=0) if len(edge) else np.array([0, 255, 0], np.float32)
    dist = np.sqrt(((a[..., :3] - bgc) ** 2).sum(-1))
    loose = screen & (dist < 150)
    lab, _ = ndi.label(loose)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    hard = (screen & (dist < 60)) | (np.isin(lab, border[border > 0]))
    band = ndi.binary_dilation(hard, iterations=3) & ~hard
    soft = np.clip(1.0 - (spill - 16.0) / 100.0, 0.0, 1.0)
    alpha = np.where(hard, 0.0, 255.0)
    alpha = np.where(band, soft * 255.0, alpha)
    out = a.copy()
    zone = ndi.binary_dilation(hard, iterations=6)
    out[..., 1] = np.where(zone & (spill > 0), mx + np.maximum(0, spill) * 0.08, g)
    out[..., 3] = np.minimum(alpha, al)
    # Drop specks: tiny islands of opaque pixels left over from noisy keying.
    solid = out[..., 3] > 40
    lab, n = ndi.label(solid)
    if n > 1:
        sizes = ndi.sum(solid, lab, range(1, n + 1))
        tiny = np.isin(lab, np.nonzero(sizes < 14)[0] + 1)
        out[..., 3] = np.where(tiny, 0, out[..., 3])
    return out


# ---------------------------------------------------------------- geometry


def bbox(a: np.ndarray, th: float = 10) -> tuple[int, int, int, int]:
    ys, xs = np.nonzero(a[..., 3] > th)
    if len(xs) == 0:
        return 0, 0, a.shape[1], a.shape[0]
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def resize(a: np.ndarray, w: int, h: int) -> np.ndarray:
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA").convert("RGBa")
    im = im.resize((max(1, w), max(1, h)), Image.LANCZOS).convert("RGBA")
    return np.asarray(im).astype(np.float32)


def fit(a: np.ndarray, cw: int, ch: int, fill: float, margin: int = 0) -> np.ndarray:
    """Trim to content and centre it on a cw x ch canvas so the content's long
    side is `fill` of the canvas (less `margin` px on each side)."""
    x0, y0, x1, y1 = bbox(a)
    a = a[y0:y1, x0:x1]
    h, w = a.shape[:2]
    s = min((cw * fill - 2 * margin) / w, (ch * fill - 2 * margin) / h)
    nw, nh = round(w * s), round(h * s)
    a = resize(a, nw, nh)
    out = np.zeros((ch, cw, 4), np.float32)
    ox, oy = (cw - nw) // 2, (ch - nh) // 2
    out[oy:oy + nh, ox:ox + nw] = a
    return out


# ------------------------------------------------------------- compositing


def over(top: np.ndarray, bot: np.ndarray) -> np.ndarray:
    ta = top[..., 3:4] / 255.0
    ba = bot[..., 3:4] / 255.0
    oa = ta + ba * (1 - ta)
    rgb = (top[..., :3] * ta + bot[..., :3] * ba * (1 - ta)) / np.maximum(oa, 1e-6)
    return np.concatenate([rgb, oa * 255.0], axis=-1)


def solid(shape: tuple[int, int], color: tuple[int, int, int], alpha: np.ndarray) -> np.ndarray:
    out = np.zeros((*shape, 4), np.float32)
    out[..., 0], out[..., 1], out[..., 2] = color
    out[..., 3] = np.clip(alpha, 0, 1) * 255.0
    return out


def outline(a: np.ndarray, px: float, color=PLUM, alpha: float = 1.0) -> np.ndarray:
    mask = a[..., 3] > 90
    dist = ndi.distance_transform_edt(~mask)
    ring = np.clip(px + 0.5 - dist, 0, 1) * alpha
    return over(a, solid(a.shape[:2], color, ring))


CREAM = (255, 246, 222)


def friendly(a: np.ndarray, px: float) -> np.ndarray:
    """Plum keyline plus a thin cream outer line. The cream line is what keeps
    dark heroes readable on dark skies, and it marks allies apart from foes,
    which carry the plum line alone."""
    return outline(outline(a, px), max(2.0, px * 0.55), CREAM, 0.9)


def glow(a: np.ndarray, color, sigma: float, strength: float) -> np.ndarray:
    m = (a[..., 3] / 255.0).astype(np.float32)
    g = ndi.gaussian_filter(m, sigma) * strength
    g = np.clip(g * 1.6, 0, 1)
    return over(a, solid(a.shape[:2], color, g))


def tint(a: np.ndarray, color, amount: float) -> np.ndarray:
    out = a.copy()
    for i in range(3):
        out[..., i] = a[..., i] * (1 - amount) + color[i] * amount
    return out


def brighten(a: np.ndarray, k: float) -> np.ndarray:
    out = a.copy()
    out[..., :3] = np.clip(a[..., :3] * k, 0, 255)
    return out


def grey(a: np.ndarray, amount: float, dark: float) -> np.ndarray:
    out = a.copy()
    lum = a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11
    for i in range(3):
        out[..., i] = (a[..., i] * (1 - amount) + lum * amount) * dark
    return out


def stylize(a: np.ndarray) -> np.ndarray:
    """Pull painterly boss art toward the cel/sticker look of the cast: smooth
    fine texture, push saturation, and lift crushed shadows so dark bosses
    still read against dark skies."""
    rgb = Image.fromarray(np.clip(a[..., :3], 0, 255).astype(np.uint8), "RGB")
    rgb = rgb.filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.SMOOTH_MORE)
    rgb = ImageEnhance.Color(rgb).enhance(1.28)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.1)
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    arr = np.asarray(rgb).astype(np.float32)
    vis = a[..., 3] > 40
    lum = (arr[..., 0] * 0.3 + arr[..., 1] * 0.59 + arr[..., 2] * 0.11)[vis].mean()
    if lum < 110:
        gamma = 0.72 if lum < 80 else 0.84
        arr = 255.0 * (arr / 255.0) ** gamma
    out = a.copy()
    out[..., :3] = arr
    return out


# ------------------------------------------------------------------ groups


def stroke_for(size: int) -> float:
    """Outline thickness in output px: ~2px on screen at gameplay scale."""
    return max(2.5, size * 0.017)


def build_guardians() -> None:
    for gid, col in GUARDIAN_GLOW.items():
        src = key_green(load(f"guardians/{gid}_idle.webp"))
        px = stroke_for(384)
        idle = friendly(fit(src, 384, 384, 0.88, math.ceil(px * 1.6)), px)
        save(idle, f"guardians/{gid}_idle.webp")
        save(glow(brighten(idle, 1.06), col, 7, 0.9), f"guardians/{gid}_attack.webp")
        save(glow(brighten(idle, 1.1), (255, 214, 90), 9, 1.15), f"guardians/{gid}_ability.webp")
        hit = tint(brighten(idle, 1.18), (255, 120, 140), 0.38)
        save(glow(hit, (255, 255, 255), 4, 0.7), f"guardians/{gid}_hit.webp")
        save(grey(idle, 0.75, 0.72), f"guardians/{gid}_death.webp")
        # Portrait and icon keep their canvas shapes; Elara's originals are a
        # group shot, so hers are cut from the solo idle art.
        prt_src = src if gid == "elara" else key_green(load(f"guardians/{gid}_portrait.webp"))
        save(friendly(fit(prt_src, 256, 384, 0.94, 6), 4.0), f"guardians/{gid}_portrait.webp")
        save(friendly(fit(src, 85, 128, 0.96, 3), 2.0), f"guardians/{gid}_icon.webp")
    print("guardians ok")


def largest_only(a: np.ndarray) -> np.ndarray:
    """Keep the biggest connected figure; drops neighbours caught by a crop."""
    solid = ndi.binary_dilation(a[..., 3] > 40, iterations=3)
    lab, n = ndi.label(solid)
    if n <= 1:
        return a
    sizes = ndi.sum(solid, lab, range(1, n + 1))
    out = a.copy()
    out[..., 3] = np.where(lab == int(np.argmax(sizes)) + 1, a[..., 3], 0)
    return out


def build_aetherlings() -> None:
    for sp, el in SPECIES_ELEMENT.items():
        rel = f"aetherlings/{sp}_idle.webp"
        src = key_green(load(rel))
        if rel in CROPS:
            src = largest_only(src)
        px = stroke_for(384) * 1.15
        idle = friendly(fit(src, 384, 384, 0.86, math.ceil(px * 1.6)), px)
        save(idle, f"aetherlings/{sp}_idle.webp")
        save(glow(brighten(idle, 1.08), ELEMENT[el], 8, 1.0), f"aetherlings/{sp}_attack.webp")
        save(friendly(fit(src, 128, 128, 0.94, 5), 3.0), f"aetherlings/{sp}_icon.webp")
    print("aetherlings ok")


def build_enemies() -> None:
    for f in sorted((SRC / "enemies").glob("*_idle.webp")):
        name = f.stem.replace("_idle", "")
        src = key_green(load(f"enemies/{f.name}"))
        # Foes never draw above ~170px, so a 256 canvas is plenty.
        px = stroke_for(256) * 1.1
        idle = outline(fit(src, 256, 256, 0.9, math.ceil(px)), px)
        save(idle, f"enemies/{name}_idle.webp")
        # Wind-up pose shown just before a foe fires: a hostile rim and a
        # hotter body, so the attack is telegraphed without new geometry.
        save(glow(tint(brighten(idle, 1.1), (255, 150, 120), 0.12), HOSTILE, 6, 1.25), f"enemies/{name}_attack.webp")
    print("enemies ok")


def build_bosses() -> None:
    for boss, el in BOSS_ELEMENT.items():
        raw = key_green(load(f"bosses/{boss}_idle.webp"))
        src = stylize(raw)
        col = ELEMENT[el]
        vis = src[..., 3] > 40
        lum = (src[..., 0] * 0.3 + src[..., 1] * 0.59 + src[..., 2] * 0.11)[vis].mean()
        # Dark bosses need a brighter rim to hold their silhouette on dark skies.
        rim = 1.5 if lum < 95 else 1.0
        # Bosses cap at 290px on screen; 400 keeps headroom for menu portraits.
        px = stroke_for(400) * 0.95
        base = outline(fit(src, 400, 400, 0.86, math.ceil(px) + 6), px)
        idle = glow(base, col, 6, 0.75 * rim)
        save(idle, f"bosses/{boss}_idle.webp")
        save(glow(brighten(base, 1.12), col, 10, 1.5 * rim), f"bosses/{boss}_attack.webp")
        save(glow(tint(brighten(base, 1.2), (255, 236, 236), 0.42), (255, 255, 255), 5, 0.9), f"bosses/{boss}_hit.webp")
        save(grey(base, 0.8, 0.65), f"bosses/{boss}_death.webp")
    print("bosses ok")


def build_icons() -> None:
    groups = {"icons": 0.9, "powerups": 0.9, "eggs": 0.92}
    for group, fill in groups.items():
        for f in sorted((SRC / group).glob("*.webp")):
            a = key_green(load(f"{group}/{f.name}"))
            w, h = a.shape[1], a.shape[0]
            # Tiny element glyphs were drawn without any outline and vanish at
            # chip size; give them the same stroke as everything else.
            px = 6.0 if f.name.startswith("el_") else 4.0
            save(outline(fit(a, w, h, fill, math.ceil(px)), px), f"{group}/{f.name}")
    build_element_badges()
    for f in sorted((SRC / "particles").glob("*.webp")):
        save(key_green(load(f"particles/{f.name}")), f"particles/{f.name}")
    style = key_green(load("ui/style_bible.webp"))
    save(style, "ui/style_bible.webp")
    print("icons ok")


def _teardrop(s: float, width: float, sharp: float, lean: float = 0.0, dy: float = 0.0):
    pts = []
    for i in range(120):
        a = i / 120 * 2 * math.pi
        x = math.sin(a) * abs(math.sin(a / 2)) ** sharp * width
        y = -math.cos(a) * 0.74
        x += lean * max(0.0, -y) ** 2
        pts.append((x * s, (y + dy) * s))
    return pts


def _chaikin(pts, rounds: int):
    for _ in range(rounds):
        nxt = []
        for i in range(len(pts)):
            (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % len(pts)]
            nxt += [(x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25), (x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75)]
        pts = nxt
    return pts


def _glyph_mask(name: str, S: int):
    """White glyph mask (L) for an element badge, drawn at S x S."""
    from PIL import ImageDraw

    m = Image.new("L", (S, S), 0)
    inner = Image.new("L", (S, S), 0)
    dm, di = ImageDraw.Draw(m), ImageDraw.Draw(inner)
    c, s = S / 2, S * 0.44
    off = lambda poly: [(c + x, c + y) for x, y in poly]
    if name == "fire":
        flame = [(0.04, -0.86), (0.2, -0.46), (0.4, -0.62), (0.56, -0.12), (0.54, 0.28), (0.36, 0.6),
                 (0.0, 0.74), (-0.36, 0.6), (-0.54, 0.26), (-0.48, -0.16), (-0.3, 0.0), (-0.26, -0.44)]
        dm.polygon(off([(x * s, y * s) for x, y in _chaikin(flame, 3)]), fill=255)
        core = [(0.02, -0.12), (0.22, 0.24), (0.22, 0.48), (0.0, 0.6), (-0.22, 0.48), (-0.22, 0.26)]
        di.polygon(off([(x * s, y * s) for x, y in _chaikin(core, 3)]), fill=255)
    elif name == "water":
        dm.polygon(off(_teardrop(s, 0.58, 1.0, 0.0, 0.08)), fill=255)
        di.ellipse((c - s * 0.3, c + s * 0.0, c - s * 0.12, c + s * 0.32), fill=255)
    elif name == "nature":
        leaf = []
        for i in range(120):
            a = i / 120 * 2 * math.pi
            x, y = math.sin(a) * 0.4 * (1 - 0.3 * math.cos(a)), -math.cos(a) * 0.76
            cs, sn = math.cos(0.65), math.sin(0.65)
            leaf.append((x * cs - y * sn, x * sn + y * cs))
        dm.polygon(off([(x * s, y * s) for x, y in leaf]), fill=255)
        a0, a1 = (-0.55, 0.5), (0.5, -0.38)
        di.line(off([(a0[0] * s, a0[1] * s), (a1[0] * s, a1[1] * s)]), fill=255, width=int(S * 0.03))
    elif name == "shadow":
        r = s * 0.7
        dm.ellipse((c - r, c - r, c + r, c + r), fill=255)
        r2 = s * 0.6
        cx2, cy2 = c + s * 0.34, c - s * 0.2
        dm.ellipse((cx2 - r2, cy2 - r2, cx2 + r2, cy2 + r2), fill=0)
        for (sx, sy, sr) in ((0.42, 0.3, 0.09), (0.62, -0.02, 0.06)):
            di.ellipse((c + s * sx - s * sr, c + s * sy - s * sr, c + s * sx + s * sr, c + s * sy + s * sr), fill=255)
    elif name == "light":
        rays = []
        for i in range(16):
            a = i / 16 * 2 * math.pi
            rr = 0.8 if i % 2 == 0 else 0.46
            rays.append((math.cos(a) * rr * s, math.sin(a) * rr * s))
        dm.polygon(off(rays), fill=255)
        r = s * 0.3
        di.ellipse((c - r, c - r, c + r, c + r), fill=255)
    else:
        star = []
        for i in range(8):
            a = i / 8 * 2 * math.pi - math.pi / 2
            rr = 0.8 if i % 2 == 0 else 0.24
            star.append((math.cos(a) * rr * s, math.sin(a) * rr * s))
        dm.polygon(off(star), fill=255)
        for (sx, sy) in ((0.5, -0.5), (-0.52, 0.48)):
            r = s * 0.08
            dm.ellipse((c + sx * s - r, c + sy * s - r, c + sx * s + r, c + sy * s + r), fill=255)
    return np.asarray(m).astype(np.float32) / 255, np.asarray(inner).astype(np.float32) / 255


def build_element_badges() -> None:
    S = 640
    for name, col in ELEMENT.items():
        yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
        cx = cy = S / 2
        d = np.hypot(xx - cx, yy - cy) / (S / 2)
        out = np.zeros((S, S, 4), np.float32)
        # Gem disc: lit from the upper left, deepening toward the rim.
        light = np.array([min(255, c * 0.55 + 140) for c in col], np.float32)
        deep = np.array([c * 0.42 for c in col], np.float32)
        ld = np.hypot(xx - cx * 0.75, yy - cy * 0.7) / (S * 0.62)
        t = np.clip(ld, 0, 1)[..., None]
        disc = light * (1 - t) + deep * t
        inside = d < 0.78
        out[inside, :3] = disc[inside]
        out[inside, 3] = 255
        # Gold rim and plum keyline.
        rim = (d >= 0.78) & (d < 0.92)
        gold_t = np.clip((yy - cy) / (S * 0.5) * 0.5 + 0.5, 0, 1)[rim]
        out[rim, 0] = 255 * (1 - gold_t) + 196 * gold_t
        out[rim, 1] = 228 * (1 - gold_t) + 128 * gold_t
        out[rim, 2] = 140 * (1 - gold_t) + 40 * gold_t
        out[rim, 3] = 255
        key = (d >= 0.92) & (d < 1.0)
        out[key, :3] = PLUM
        out[key, 3] = 255
        mask, inner = _glyph_mask(name, S)
        dist = ndi.distance_transform_edt(mask < 0.5)
        ring = np.clip(13 - dist, 0, 1)
        shadow = np.roll(np.roll(np.maximum(ring, mask), 12, 0), 9, 1) * 0.55
        out = over(solid((S, S), PLUM, shadow * inside), out)
        out = over(solid((S, S), PLUM, ring), out)
        out = over(solid((S, S), (255, 252, 240), mask), out)
        out = over(solid((S, S), tuple(int(v) for v in light * 0.8 + np.array(col, np.float32) * 0.2), inner * mask), out)
        # Gloss highlight across the top of the gem.
        gl = np.clip(1 - np.hypot((xx - cx * 0.8) / (S * 0.3), (yy - cy * 0.52) / (S * 0.13)), 0, 1) * 0.42
        gl *= inside
        out[..., :3] = out[..., :3] * (1 - gl[..., None]) + 255 * gl[..., None]
        save(resize(out, 160, 160), f"icons/el_{name}.webp")


# ------------------------------------------------------------ environments

WORLDS = [
    "meadows", "crystal_forest", "ember_canyon", "frozen_skies",
    "shadow_realm", "storm_kingdom", "celestial_ruins", "void_frontier",
]


def seamless(rgb: np.ndarray, k: int) -> np.ndarray:
    """Vertical loop: drop the first k rows and crossfade them into the last
    k rows, so the bottom flows straight back into the top."""
    h = rgb.shape[0]
    out = rgb[k:].copy()
    n = h - k
    t = np.linspace(0, 1, k, dtype=np.float32)[:, None, None]
    t = t * t * (3 - 2 * t)
    out[n - k:] = rgb[n:] * (1 - t) + rgb[:k] * t
    return out


def tone(rgb: np.ndarray) -> np.ndarray:
    """Bring every painting into one value band so combat reads on top of it:
    mid-range brightness, moderate contrast and saturation, and a soft blur
    for depth. Adaptive, because the sources range from near-white pastel
    (meadows) to near-black (shadow realm)."""
    im = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")
    sat = np.asarray(im.convert("HSV"))[..., 1].mean()
    im = im.filter(ImageFilter.GaussianBlur(1.3))
    im = ImageEnhance.Color(im).enhance(0.98 if sat < 80 else 0.85 if sat > 170 else 0.92)
    arr = np.asarray(im).astype(np.float32)
    lum = lambda a: a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11
    if lum(arr).mean() < 50:
        arr = 255.0 * (arr / 255.0) ** 0.62
    l = lum(arr)
    mean, std = l.mean(), l.std()
    arr = mean + (arr - mean) * float(np.clip(32.0 / max(std, 1.0), 0.62, 1.18))
    target = float(np.clip(mean, 62, 165))
    arr = arr + (target - mean)
    return arr


def _cumulus(xx, yy, cx, base, span, rng, h):
    """One flat-based cumulus bank as a density field, wrapped vertically."""
    field = np.zeros(xx.shape, np.float32)
    n = int(rng.integers(6, 10))
    for k in range(n):
        t = k / max(1, n - 1)
        px = cx + (t - 0.5) * span + rng.normal(0, span * 0.06)
        # Middle puffs ride higher, so the bank domes up from a flat base.
        r = span * (0.16 + 0.14 * math.sin(t * math.pi)) * rng.uniform(0.85, 1.15)
        py = base - r * 0.55
        for dy in (-h, 0, h):
            d = np.hypot(xx - px, yy - (py + dy))
            field += np.clip(1.0 - d / r, 0, 1) ** 1.2
    for dy in (-h, 0, h):
        under = np.clip((yy - (base + dy)) / 22.0, 0, 1)
        near = np.abs(yy - (base + dy)) < span
        field = np.where(near, field * (1 - under), field)
    return field


def cloud_layer(w: int, h: int, light, shade, seed: int, edge_only: bool, density: float) -> np.ndarray:
    """Painted cloud banks that hug the side edges (the centre lane stays
    clear for combat), plus faint mist streaks for a sense of speed. Wrapped
    vertically so the layer loops with the background."""
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    field = np.zeros((h, w), np.float32)
    count = max(2, int(round(6 * density)))
    for c in range(count):
        side = c % 2
        span = rng.uniform(200, 320) * (1.25 if edge_only else 1.0)
        cx = rng.uniform(-span * 0.25, span * 0.1) if side == 0 else rng.uniform(w - span * 0.1, w + span * 0.25)
        base = (c + rng.uniform(0.1, 0.9)) / count * h
        field += _cumulus(xx, yy, cx, base, span, rng, h)
    blur = 9 if edge_only else 5
    field = ndi.gaussian_filter(field, blur, mode="wrap")
    alpha = np.clip((field - 0.12) / 0.7, 0, 1)
    alpha = alpha * alpha * (3 - 2 * alpha) * (0.62 if edge_only else 0.8)
    if not edge_only:
        mist = np.zeros((h, w), np.float32)
        for _ in range(5):
            my, mx = rng.uniform(0, h), rng.uniform(w * 0.15, w * 0.85)
            for dy in (-h, 0, h):
                mist += np.exp(-(((xx - mx) / 170) ** 2 + ((yy - my - dy) / 9) ** 2))
        alpha = np.maximum(alpha, np.clip(mist, 0, 1) * 0.16)
    lit = ndi.gaussian_filter(field, 12, mode="wrap")
    grad = np.roll(lit, -10, axis=0) - np.roll(lit, 10, axis=0)
    shine = np.clip(0.62 + grad * 1.1, 0, 1)
    rgb = np.zeros((h, w, 3), np.float32)
    for i in range(3):
        rgb[..., i] = shade[i] + (light[i] - shade[i]) * shine
    return np.concatenate([rgb, alpha[..., None] * 255.0], axis=-1)


def palette_from(rgb: np.ndarray) -> tuple[tuple, tuple]:
    lum = rgb[..., 0] * 0.3 + rgb[..., 1] * 0.59 + rgb[..., 2] * 0.11
    flat = rgb.reshape(-1, 3)
    order = np.argsort(lum.reshape(-1))
    hi = flat[order[int(len(order) * 0.93):]].mean(axis=0)
    mid = flat[order[int(len(order) * 0.45):int(len(order) * 0.6)]].mean(axis=0)
    light = tuple(np.clip(hi * 0.45 + 255 * 0.55, 0, 255))
    shade = tuple(np.clip(mid * 0.45 + hi * 0.55, 0, 255))
    return light, shade


def build_env() -> None:
    for i, world in enumerate(WORLDS):
        rgb = np.asarray(Image.open(SRC / f"environments/{world}_bg.webp").convert("RGB")).astype(np.float32)
        loop = tone(seamless(rgb, 260))
        save_rgb(loop, f"environments/{world}_bg.webp", 78)
        light, shade = palette_from(rgb)
        w, h = loop.shape[1], loop.shape[0]
        mid = cloud_layer(w, h, light, shade, 100 + i, edge_only=False, density=1.0)
        save(mid, f"environments/{world}_mid.webp", 72)
        fg = cloud_layer(w, h, light, shade, 900 + i, edge_only=True, density=0.6)
        fg[..., 3] *= 0.85
        save(fg, f"environments/{world}_fg.webp", 70)
    # Hangar clouds: two plain white painted clouds, used in the menu sky.
    for j in range(2):
        c = single_cloud(360, 200, 70 + j)
        save(c, f"ui/cloud_{'ab'[j]}.webp", 80)
    print("env ok")


def single_cloud(w: int, h: int, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    field = np.zeros((h, w), np.float32)
    for _ in range(9):
        px = rng.uniform(w * 0.22, w * 0.78)
        py = rng.uniform(h * 0.4, h * 0.62)
        r = rng.uniform(38, 70)
        d = np.hypot(xx - px, yy - py)
        field += np.clip(1.0 - d / r, 0, 1) ** 1.3
    flat = np.clip((yy - h * 0.66) / 14, 0, 1)
    field *= 1 - flat
    field = ndi.gaussian_filter(field, 2.5)
    alpha = np.clip((field - 0.2) / 0.35, 0, 1)
    lit = ndi.gaussian_filter(field, 8)
    grad = np.roll(lit, -6, axis=0) - np.roll(lit, 6, axis=0)
    shine = np.clip(0.6 + grad * 2.2, 0, 1)
    light, shade = (255, 253, 248), (214, 204, 232)
    rgb = np.zeros((h, w, 3), np.float32)
    for i in range(3):
        rgb[..., i] = shade[i] + (light[i] - shade[i]) * shine
    return np.concatenate([rgb, alpha[..., None] * 255.0], axis=-1)


GROUPS = {
    "guardians": build_guardians,
    "aetherlings": build_aetherlings,
    "enemies": build_enemies,
    "bosses": build_bosses,
    "icons": build_icons,
    "env": build_env,
}

if __name__ == "__main__":
    picks = sys.argv[1:] or list(GROUPS)
    for name in picks:
        GROUPS[name]()
