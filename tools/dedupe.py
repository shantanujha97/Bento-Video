# Replace repeated dummy data + token icons on the exported screens (Friends font isn't available inside Figma's plugin
# sandbox, so the text is redrawn here with the real font files, aligned to the original glyphs by matching).
from PIL import Image, ImageDraw, ImageFont
import numpy as np
S = 2.65
FONT = {'SemiBold': 'fonts/Friends-SemiBold.ttf', 'Regular': 'fonts/Friends-Regular.ttf'}
def hexc(h, op=1.0): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
def bg_of(arr):
    q = (arr // 6).reshape(-1, 3); vals, cnt = np.unique(q, axis=0, return_counts=True); m = vals[cnt.argmax()]
    sel = (q == m).all(1); return tuple(int(v) for v in arr.reshape(-1, 3)[sel].mean(0))
def render(size, w, h, s, font, col, bg):
    im = Image.new('RGB', (w, h), bg); ImageDraw.Draw(im).text((0, 0), s, font=font, fill=col); return im
class Patcher:
    def __init__(self, path, dy=0): self.path = path; self.im = Image.open(path).convert('RGB'); self.dy = dy; self.orig = self.im.copy()
    def px(self, x, y): return int(round(x * S)), int(round((y - self.dy) * S))
    def text(self, box, old, new, fs, fw, col, al='LEFT', lh=100, wrap=None):
        x, y, w, h = box; X0, Y0 = self.px(x, y); X1, Y1 = self.px(x + w, y + h)
        pad = int(3 * S); region = np.asarray(self.orig.crop((X0 - pad, Y0 - pad, X1 + pad, Y1 + pad))).astype(int)
        bg = bg_of(region); font = ImageFont.truetype(FONT[fw], int(round(fs * S))); c = hexc(col)
        # find where the original glyphs sit: draw `old` at candidate offsets, keep the best match
        lines_old = old.split('\n') if wrap is None else self.wrap(old, font, wrap)
        best = (1e18, 0, 0); tgt = np.asarray(self.orig.crop((X0 - pad, Y0 - pad, X1 + pad, Y1 + pad))).astype(int)
        for oy in range(-int(5 * S), int(5 * S) + 1, 1):
            for ox in ([0] if al == 'LEFT' else [0]) + list(range(-int(3 * S), int(3 * S) + 1, 2)):
                can = Image.new('RGB', (X1 - X0 + 2 * pad, Y1 - Y0 + 2 * pad), bg); d = ImageDraw.Draw(can)
                for i, ln in enumerate(lines_old):
                    tw = d.textlength(ln, font=font); tx = pad + ox + (0 if al == 'LEFT' else (X1 - X0) - tw)
                    d.text((tx, pad + oy + i * lh / 100 * fs * S), ln, font=font, fill=c)
                e = np.abs(np.asarray(can).astype(int) - tgt).sum()
                if e < best[0]: best = (e, ox, oy)
        _, ox, oy = best
        d = ImageDraw.Draw(self.im); d.rectangle((X0 - 2, Y0 - 2, X1 + 2, Y1 + 2), fill=bg)
        lines = new.split('\n') if wrap is None else self.wrap(new, font, wrap)
        for i, ln in enumerate(lines):
            tw = d.textlength(ln, font=font); tx = X0 + ox + (0 if al == 'LEFT' else (X1 - X0) - tw)
            d.text((tx, Y0 + oy + i * lh / 100 * fs * S), ln, font=font, fill=c)
    def wrap(self, s, font, width):
        out, cur = [], ''
        for wd in s.split(' '):
            t = (cur + ' ' + wd).strip()
            if font.getlength(t) <= width * S: cur = t
            else: out.append(cur); cur = wd
        out.append(cur); return out
    def logo(self, box, name):
        x, y, w, h = box; X0, Y0 = self.px(x, y); X1, Y1 = self.px(x + w, y + h); pad = int(2 * S)
        ring = np.asarray(self.orig.crop((X0 - pad, Y0 - pad, X1 + pad, Y1 + pad))).astype(int)
        edge = np.concatenate([ring[:pad].reshape(-1, 3), ring[-pad:].reshape(-1, 3), ring[:, :pad].reshape(-1, 3), ring[:, -pad:].reshape(-1, 3)])
        bg = tuple(int(v) for v in np.median(edge, 0))
        ImageDraw.Draw(self.im).ellipse((X0 - 1, Y0 - 1, X1 + 1, Y1 + 1), fill=bg)
        lg = Image.open(f'raw/logos/{name}.png').convert('RGBA').resize((X1 - X0, Y1 - Y0), Image.LANCZOS)
        self.im.paste(lg, (X0, Y0), lg)
    def save(self, path): self.im.save(path)

# ---------- data ----------
W, G, GR = '#ffffff', '#22ed4e', '#b4b4b2'
rows7 = [261 + 52 * i for i in range(7)]
# Leaderboard (rank 6 is the user: their real address + the same 10,672 points as the Wasabi screen)
p = Patcher('raw/leaderboard.png')
A = ['0x71c2...9e04', '0xa93f...12bd', '0x4be0...c77a', '0xd18e...3f51', '0x2c6a...8b90', '0x8e5b...4d93', '0xf0b4...61ce']
P = ['48,210', '41,875', '37,402', '29,960', '24,318', '10,672', '9,845']; C = ['4.11%', '3.57%', '3.19%', '2.55%', '2.07%', '0.91%', '0.84%']
for i, y in enumerate(rows7):
    if A[i] != '0x8e5b...4d93': p.text((511.8, y, 227.4, 16), '0x8e5b...4d93', A[i], 16, 'Regular', GR)
    p.text((739.1, y, 165.7, 16), '10,567', P[i], 16, 'SemiBold', G)
    p.text((904.8, y, 165.7, 16), '15.90%', C[i], 16, 'SemiBold', W, 'RIGHT')
p.save('raw/x_leaderboard.png')
# Referees
p = Patcher('raw/referees.png')
A = ['0x3f9a7c21e8b04d6a95f2c1e7d3b80a', '0x91d4e0b7a2c65f38e1d9047bc2a6f5', '0x5c27b9e1f40a8d63c7e2b51a9f0d4e', '0xe8a13f6d02c97b54a1e6f0d38b2c7a', '0x0b6fd2a84e1c93b75d0a6e2f81c4b9', '0x7a4e9c0d3b61f82a5e9d1c07b4f3a2', '0xc2f08e5a7d13b49c60e8a2f5d17b0c']
P = ['1,240', '986', '874', '702', '561', '418', '295']
for i, y in enumerate(rows7):
    p.text((433, y, 285, 16), '0x8e5bqeht489hq8t94298qeht462159', A[i], 16, 'Regular', GR)
    p.text((718, y, 285, 16), '10,567', P[i], 16, 'SemiBold', G, 'RIGHT')
p.save('raw/x_referees.png')
# Wallet drawer: four different "Other Assets"
p = Patcher('raw/wallet.png')
TK = ['USDC', 'USDT', 'USDe', 'sUSDS']; AM = ['2,450.00', '1,120.50', '860.00', '312.40']; US = ['$2,450.00', '$1,120.62', '$859.31', '$318.90']
for i, y in enumerate([573, 639, 705, 771]):
    if i: p.text((1015, y, 46, 16), 'USDC', TK[i], 16, 'SemiBold', W); p.logo((967, y - 11, 36, 36), TK[i])
    p.text((1335, y - 9, 63, 16), '1,567.00', AM[i], 16, 'SemiBold', W)
    p.text((1334, y + 11, 64, 14), '$1,567.00', US[i], 14, 'SemiBold', GR)
p.save('raw/x_wallet.png')
# Pre-deposit modals: four distinct steps; Wasabi farm token chips + multipliers
STW = [('Deposit USDe or sUSDe', 'Mint pUSDe to earn Wasabi points and Ethena rewards, boosted up to 50x.'), ('Deposit USDC or USDT', 'Swapped 1:1 into bentoUSD and farmed for Wasabi points.'), ('Stake into bentoUSD+', 'Earn the Bento Savings Rate on top of your points.'), ('Refer a friend', 'Earn 10% of every point your invitees farm.')]
STY = [('Deposit USDe or sUSDe', 'Your stablecoins are routed into the Bento Yield vault.'), ('Mint bentoUSD+', 'Receive bentoUSD+ 1:1, growing with the Bento Savings Rate.'), ('Boost with Ethena', 'Ethena rewards stack on top for a 15.5% boosted APY.'), ('Withdraw anytime', 'No lockups. Redeem back to stables whenever you want.')]
OLD_T, OLD_D = 'Deposit USDe/sUSDe or any other asset', 'Mint pUSDe to earn STRATS + Ethena rewards boosted up to 50x.'
for src, dst, steps, x0 in [('raw/pd_wasabi.png', 'raw/x_pd_wasabi.png', STW, 377.5), ('raw/pd_yield.png', 'raw/x_pd_yield.png', STY, 377)]:
    p = Patcher(src, dy=55)
    for i, y in enumerate([311.5, 412.5, 513.5, 614.5]):
        p.text((x0, y, 290, 16), OLD_T, steps[i][0], 16, 'SemiBold', W)
        p.text((x0, y + 24, 305.2, 48), OLD_D, steps[i][1], 16, 'Regular', GR, lh=150, wrap=305.2)
    if 'wasabi' in src:
        chips = [(658.5, 325), (788.5, 325), (983.5, 325), (1113.5, 325), (762.5, 372), (892.5, 372), (1022.5, 372), (658.5, 419), (788.5, 419), (918.5, 419), (1113.5, 419), (762.5, 466), (892.5, 466), (1022.5, 466), (658.5, 513), (788.5, 513), (983.5, 513), (1113.5, 513), (762.5, 560), (892.5, 560), (1022.5, 560), (658.5, 607), (788.5, 607), (983.5, 607), (1113.5, 607)]
        seq = ['USDT', 'USDC', 'USDe', 'USDC', 'USDe', 'USDT', 'USDC', 'USDe', 'USDT', 'USDC', 'USDe', 'USDT']
        chips = [(x, y) for x, y in chips if x - 26 >= 736 and x + 38 <= 1092]   # only chips inside the visible (clipped) strip
        for i, (x, y) in enumerate(chips):
            t = seq[i % len(seq)]
            if t != 'USDT': p.text((x, y, 38, 14), 'USDT', t, 14, 'SemiBold', W); p.logo((x - 26, y - 3, 20, 20), t)
        mult = [(712.5, 325), (842.5, 325), (892.5, 325), (1037.5, 325), (1167.5, 325), (816.5, 372), (946.5, 372), (1076.5, 372), (712.5, 419), (842.5, 419), (972.5, 419), (1022.5, 419), (1167.5, 419), (816.5, 466), (946.5, 466), (1076.5, 466), (712.5, 513), (842.5, 513), (892.5, 513), (1037.5, 513), (1167.5, 513), (816.5, 560), (946.5, 560), (1076.5, 560), (1126.6, 560), (712.5, 607), (842.5, 607), (892.5, 607), (1037.5, 607), (1167.5, 607)]
        mx = ['3x', '2x', '5x', '4x', '2x', '5x', '3x', '2x', '4x', '3x']
        mult = [(x, y) for x, y in mult if x >= 736 and x + 16 <= 1092]
        for i, (x, y) in enumerate(mult): p.text((x, y, 16, 14), '2x', mx[i % len(mx)], 14, 'SemiBold', G)
    p.save(dst)
# Wasabi Earning Activities (page export used by the scene + the montage's top-810)
B = ['1,250.00 bentoUSD', '840.12 USDC', '512.40 USDC', '206.75 USDC', '3,120.00 USDC']; TT = ['420', '287', '194', '865', '513']; H = ['42', '29', '19', '86', '51']
R1 = ['10x', '15x', '20x', '12x', '25x']; R2 = ['12x', '10x', '15x', '10x', '20x']
for src, dst in [('raw/wa_base.png', 'raw/x_wa_base.png'), ('raw/m_wa_810.png', 'raw/x_m_wa_810.png')]:
    p = Patcher(src)
    for i, y in enumerate([745.5, 816.5, 887.5, 958.5, 1029.5]):
        if (y + 20) * S > p.im.height: break
        p.text((582, y, 167.3, 16), '23.22 USDC', B[i], 16, 'SemiBold', W)
        p.text((775.3, y + 1, 30, 16), '100', TT[i], 16, 'SemiBold', W)
        p.text((821.3, y + 1, 19, 16), '10', H[i], 16, 'SemiBold', W)
        p.text((1006.3, y + 1, 28, 16), '10x', R1[i], 16, 'SemiBold', W)
        p.text((1090.8, y + 1, 28, 16), '10x', R2[i], 16, 'SemiBold', W)
    p.save(dst)
print('done')
