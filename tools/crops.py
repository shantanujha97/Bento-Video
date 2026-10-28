# Cuts Bento video layers from the 2.65x Figma renders. All rects are in Figma (world) units.
from PIL import Image, ImageDraw
import json
S = 2.65
R, A = 'raw', 'assets'
def load(n): return Image.open(f'{R}/{n}.png').convert('RGBA')
def rrmask(w, h, radii, k=4):
    tl, tr, br, bl = radii
    m = Image.new('L', (w * k, h * k), 0); d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, w * k - 1, h * k - 1], radius=int(max(radii) * S * k), fill=255)
    # per-corner: rebuild with the smallest radius then add the larger corners
    m = Image.new('L', (w * k, h * k), 255); d = ImageDraw.Draw(m)
    for (cx, cy, r, quad) in [(0, 0, tl, 'tl'), (w * k, 0, tr, 'tr'), (w * k, h * k, br, 'br'), (0, h * k, bl, 'bl')]:
        rr = int(r * S * k)
        if rr <= 0: continue
        box = {'tl': [0, 0, rr, rr], 'tr': [w * k - rr, 0, w * k, rr], 'br': [w * k - rr, h * k - rr, w * k, h * k], 'bl': [0, h * k - rr, rr, h * k]}[quad]
        d.rectangle(box, fill=0)
        e = {'tl': [0, 0, 2 * rr, 2 * rr], 'tr': [w * k - 2 * rr, 0, w * k, 2 * rr], 'br': [w * k - 2 * rr, h * k - 2 * rr, w * k, h * k], 'bl': [0, h * k - 2 * rr, 2 * rr, h * k]}[quad]
        d.ellipse(e, fill=255)
        # re-fill the inner part of the corner box that the ellipse doesn't cover toward the centre
        inner = {'tl': [rr, 0, rr, rr], 'tr': [w * k - rr, 0, w * k - rr, rr], 'br': [w * k - rr, h * k - rr, w * k - rr, h * k], 'bl': [rr, h * k - rr, rr, h * k]}
    return m.resize((w, h), Image.LANCZOS)
man = {}
def crop(src, name, x, y, w, h, radii=(0, 0, 0, 0), extra=None):
    im = load(src); X, Y, W, H = round(x * S), round(y * S), round(w * S), round(h * S)
    c = im.crop((X, Y, X + W, Y + H))
    if any(radii):
        m = rrmask(W, H, radii)
        if extra: m = extra(m, W, H)
        a = c.split()[3]; from PIL import ImageChops; c.putalpha(ImageChops.multiply(a, m))
    c.save(f'{A}/{name}.png'); man[name] = [x, y, w, h]; print(name, c.size)
def base(src, name, h=None):
    im = load(src).convert('RGB')
    if h: im = im.crop((0, 0, im.width, round(h * S)))
    im.save(f'{A}/{name}.jpg', quality=92); man[name] = [0, 0, 1440, im.height / S]; print(name, im.size)

base('ov_base', 'ov_base', 1300)
crop('ov_base', 'chip', 427.5, 409, 97, 32.5, (10, 10, 10, 10))
base('sav_base', 'sav_base')
crop('sav_lines_full', 'sav_lines', 257, 477, 717, 206)
crop('sav_orig', 'tooltip', 422, 474.3, 245, 183, (16, 16, 16, 16))
crop('sav_base', 'dep_btn', 984, 710, 432, 55, (0, 0, 24, 12))
base('tr_base', 'tr_base')
for i, (y, bx) in enumerate([(673, 1010.5), (741, 1068.1), (809, 1126.3), (877, 1300.1)]):
    crop('tr_rows', f'row{i}', 257, y, 1159, 64, (8, 8, 8, 8))
    crop('tr_bars', f'bar{i}', bx, y, 1416 - bx, 64, (12, 8, 8, 12))
base('wa_base', 'wa_base')
crop('wa_base', 'invite', 1314, 305, 86, 34, (12, 12, 12, 12))
base('mo_bg', 'ref_bg')
def modal_mask(m, W, H):  # modal (499 tall) + 6px gap + footer (96 tall)
    from PIL import ImageChops
    top = rrmask(W, round(499 * S), (24, 24, 12, 12)); bot = rrmask(W, round(96 * S), (12, 12, 24, 24))
    full = Image.new('L', (W, H), 0); full.paste(top, (0, 0)); full.paste(bot, (0, H - bot.height)); return full
crop('mo_full', 'modal', 460.1, 104.5, 519.8, 601, (1, 1, 1, 1), modal_mask)
crop('mo_full', 'create_btn', 484.1, 541.5, 471.8, 38, (12, 12, 12, 12))
crop('lc_full', 'lc_modal', 460.1, 229, 519.8, 352, (24, 24, 24, 24))
crop('lc_full', 'copy_btn', 484.1, 519, 471.8, 38, (12, 12, 12, 12))
json.dump(man, open(f'{A}/manifest.json', 'w'), indent=1)

# ---- v2: every screen is a 1440x810 viewport; Transparency scrolls under a fixed navbar ----
for src, name in [('ov_base', 'ov_810'), ('sav_base', 'sav_810'), ('wa_base', 'wa_810')]:
    base(src, name, 810)
crop('tr_base', 'tr_nav', 0, 0, 1440, 74)
# TVL patch: a clean vertical strip of the TVL pill (it is a gradient), tiled across the value so it can tick live
im = load('ov_base'); X = round(1105 * S); strip = im.crop((X, round(22 * S), X + 6, round(52 * S)))
patch = Image.new('RGBA', (round(116 * S), strip.height)); [patch.paste(strip, (x, 0)) for x in range(0, patch.width, 6)]
patch.save(f'{A}/tvl_patch.png'); man['tvl_patch'] = [1108, 22, 116, 30]
json.dump(man, open(f'{A}/manifest.json', 'w'), indent=1)

# v2: fixed sidebar for the scrolling Transparency page — nav on top, footer pinned to the 810 viewport bottom
_im = load('tr_base'); _W = round(240 * S)
_top = _im.crop((0, 0, _W, round(520 * S))); _bot = _im.crop((0, round(843 * S), _W, round(1150 * S)))
_side = Image.new('RGBA', (_W, round(810 * S))); _side.paste(_top, (0, 0)); _side.paste(_bot, (0, round(503 * S)))
_side.convert('RGB').save(f'{A}/tr_side.jpg', quality=93)

# v2: Wasabi page scrolls too — fixed nav + sidebar (footer pinned to the 810 viewport bottom)
crop('wa_base', 'wa_nav', 0, 0, 1440, 74)
_im = load('wa_base'); _W = round(240 * S)
_top = _im.crop((0, 0, _W, round(515 * S))); _bot = _im.crop((0, round(802 * S), _W, round(1100 * S)))
_side = Image.new('RGBA', (_W, round(810 * S))); _side.paste(_top, (0, 0)); _side.paste(_bot, (0, round(515 * S)))
_side.convert('RGB').save(f'{A}/wa_side.jpg', quality=93)

# v10: Overview "Earn" button (bentoUSD+ card) — pressed at the end of the glide
crop('ov_base', 'earn_btn', 1310, 290, 88, 34, (12, 12, 12, 12))
