"""Mar largo calçada: near-square stones in rows that follow each wave edge,
irregular filler stones where the rows from both edges meet (as a calceteiro lays it)."""
import math, random, os, sys
import numpy as np
from scipy.spatial import cKDTree

OUT = sys.argv[1]
W = 168.0
BAND = 30.0
P = 2 * BAND        # tile height
A = 25.0
BW = 0.45
STONE = 7.0
S = 2.0             # output scale
rnd = random.Random(5)
om = 2 * math.pi / W
b = BW / om

def curve(t):
    return (t - b * math.sin(om * t), A * math.cos(om * t))

def yb(x):  # boundary 0 height at x (x(t) is monotone because BW < 1)
    lo, hi = x - b - 1, x + b + 1
    for _ in range(60):
        m = (lo + hi) / 2
        if curve(m)[0] < x: lo = m
        else: hi = m
    return curve((lo + hi) / 2)[1]

def band_of(x, y):
    return math.floor((y - yb(x)) / BAND)

# dense samples of all boundary curves around the tile
bpts, bnorm = [], []
for k in range(-3, 4):
    for i in range(int(3 * W / 0.5)):
        t = -W + i * 0.5
        x, y = curve(t)
        x2, y2 = curve(t + 0.01)
        tx, ty = x2 - x, y2 - y
        n = math.hypot(tx, ty)
        bpts.append((x, y + k * BAND)); bnorm.append((-ty / n, tx / n))
bpts = np.array(bpts); bnorm = np.array(bnorm)
tree = cKDTree(bpts)

def dist(x, y):
    return tree.query((x, y))[0]

stones = []  # (cx, cy, ux, uy, length, height, dark)
def add(cx, cy, ux, uy, ln, h):
    stones.append((cx, cy, ux, uy, ln, h, band_of(cx, cy) % 2 == 0))

# 1) rows parallel to every boundary, offset inward on both sides
for k in range(-2, 3):
    for side in (1, -1):
        for r in range(4):
            off = (r + 0.5) * STONE
            pts = []
            for i in range(int(1.6 * W / 0.4)):
                t = -0.3 * W + i * 0.4
                x, y = curve(t)
                x2, y2 = curve(t + 0.01)
                tx, ty = x2 - x, y2 - y; n = math.hypot(tx, ty); tx, ty = tx / n, ty / n
                nx, ny = -ty * side, tx * side
                px, py = x + nx * off, y + k * BAND + ny * off
                pts.append((px, py, tx, ty, dist(px, py)))
            s, L, acc = rnd.uniform(0, 5), 0.0, []
            seg = []
            for (a, c) in zip(pts, pts[1:]):
                L += math.hypot(c[0] - a[0], c[1] - a[1])
                seg.append((L, c))
            j = 0
            while j < len(seg):
                ln = rnd.uniform(5.8, 8.6)
                target = s + ln / 2
                while j < len(seg) and seg[j][0] < target: j += 1
                if j >= len(seg): break
                cx, cy, tx, ty, d = seg[j][1]
                if abs(d - off) < STONE * 0.35:      # still nearest to its own edge
                    add(cx, cy, tx, ty, ln, STONE)
                s += ln

# drop stones crowding each other where rows from both edges meet
keep = []
ctree_pts = []
for st in stones:
    if any(math.hypot(st[0] - q[0], st[1] - q[1]) < STONE * 0.78 for q in keep):
        continue
    keep.append(st)
stones = keep

# 2) filler stones in the gaps near the middle of wide lobes
cent = cKDTree(np.array([(s_[0], s_[1]) for s_ in stones]))
for _ in range(9000):
    x, y = rnd.uniform(-10, W + 10), rnd.uniform(-10, P + 10)
    if cent.query((x, y))[0] < STONE * 0.85: continue
    if dist(x, y) < STONE * 0.6: continue
    a = rnd.uniform(0, math.pi)
    add(x, y, math.cos(a), math.sin(a), rnd.uniform(5.5, 7.5), rnd.uniform(5.5, 7.2))
    cent = cKDTree(np.array([(s_[0], s_[1]) for s_ in stones]))

def quad(st):
    cx, cy, ux, uy, ln, h, dark = st
    vx, vy = -uy, ux
    gap = rnd.uniform(0.9, 1.4)
    hw, hh = (ln - gap) / 2, (h - gap) / 2
    rot = rnd.uniform(-.1, .1); c, s_ = math.cos(rot), math.sin(rot)
    ux, uy = ux * c - uy * s_, ux * s_ + uy * c
    vx, vy = -uy, ux
    return [(cx + p * hw * ux + q * hh * vx + rnd.uniform(-.5, .5), cy + p * hw * uy + q * hh * vy + rnd.uniform(-.5, .5))
            for (p, q) in ((-1, -1), (1, -1), (1, 1), (-1, 1))]

groups = {}
for st in stones:
    cx, cy = st[0], st[1]
    # canonical copy only: centre inside the tile
    if not (0 <= cx < W and 0 <= cy < P): continue
    poly = quad(st)
    key = ('d' if st[6] else 'l') + ('2' if rnd.random() < .4 else '1')
    for dx in (-W, 0, W):
        for dy in (-P, 0, P):
            xs = [p[0] + dx for p in poly]; ys = [p[1] + dy for p in poly]
            if max(xs) < 0 or min(xs) > W or max(ys) < 0 or min(ys) > P: continue
            groups.setdefault(key, []).append('M' + ' '.join('%d %d' % (round(x * S), round(y * S)) for x, y in zip(xs, ys)) + 'Z')

def svg(joint, d1, d2, l1, l2):
    o = '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d" preserveAspectRatio="none">' % (W, P, W * S, P * S)
    o += '<rect width="%d" height="%d" fill="%s"/>' % (W * S, P * S, joint)
    for k, col in (('l1', l1), ('l2', l2), ('d1', d1), ('d2', d2)):
        o += '<path fill="%s" d="%s"/>' % (col, ''.join(groups.get(k, [])))
    return o + '</svg>'

os.makedirs(OUT, exist_ok=True)
for name, args in (('calcada2-light.svg', ('#8F8B82', '#4B5463', '#3F4756', '#EFEADF', '#E2DBCC')),
                   ('calcada2-dark.svg', ('#05070B', '#1D2330', '#252C3A', '#A39E94', '#948F85'))):
    s_ = svg(*args); open(os.path.join(OUT, name), 'w').write(s_); print(name, len(s_), len(stones))
