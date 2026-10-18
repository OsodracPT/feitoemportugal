import math, random, os, sys

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

def w(name, s):
    open(os.path.join(OUT, name), 'w').write(s)
    print(name, len(s))

# ---------------- Calçada: irregular stones in a Rossio wave ----------------
def clip(poly, a, b, c):
    # keep a*x + b*y <= c
    out = []
    n = len(poly)
    for i in range(n):
        p, q = poly[i], poly[(i + 1) % n]
        fp = a * p[0] + b * p[1] - c
        fq = a * q[0] + b * q[1] - c
        if fp <= 0: out.append(p)
        if (fp < 0) != (fq < 0) and fp != fq:
            t = fp / (fp - fq)
            out.append((p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])))
    return out

def calcada(W, H, s, A, seed):
    rnd = random.Random(seed)
    pts = []
    rows = int(H / s); cols = int(W / s)
    for r in range(rows):
        for c in range(cols):
            off = (s / 2) if r % 2 else 0
            pts.append(((c * s + off + rnd.uniform(-.38, .38) * s) % W,
                        (r * s + s / 2 + rnd.uniform(-.38, .38) * s) % H))
    allp = [(x + dx * W, y + dy * H) for (x, y) in pts for dx in (-1, 0, 1) for dy in (-1, 0, 1)]
    cells = []
    for (px, py) in pts:
        poly = [(px - 3 * s, py - 3 * s), (px + 3 * s, py - 3 * s), (px + 3 * s, py + 3 * s), (px - 3 * s, py + 3 * s)]
        for (qx, qy) in allp:
            if (qx, qy) == (px, py): continue
            if abs(qx - px) > 3 * s or abs(qy - py) > 3 * s: continue
            a, b = qx - px, qy - py
            c = (qx * qx + qy * qy - px * px - py * py) / 2
            poly = clip(poly, a, b, c)
        cx = sum(p[0] for p in poly) / len(poly); cy = sum(p[1] for p in poly) / len(poly)
        gap = rnd.uniform(0.9, 1.5)
        sh = []
        for (x, y) in poly:
            d = math.hypot(x - cx, y - cy) or 1
            k = max(0, (d - gap)) / d
            sh.append((cx + (x - cx) * k + rnd.uniform(-.35, .35), cy + (y - cy) * k + rnd.uniform(-.35, .35)))
        # drop near-duplicate vertices
        clean = []
        for p in sh:
            if not clean or math.hypot(p[0] - clean[-1][0], p[1] - clean[-1][1]) > 1.2:
                clean.append(p)
        dark = ((cy - A * math.sin(2 * math.pi * cx / W)) % H) < H / 2
        cells.append((clean, dark, rnd.random() < .45))
    groups = {k: [] for k in ('d1', 'd2', 'l1', 'l2')}
    for poly, dark, alt in cells:
        key = ('d' if dark else 'l') + ('2' if alt else '1')
        for dx in (-W, 0, W):
            for dy in (-H, 0, H):
                xs = [p[0] + dx for p in poly]; ys = [p[1] + dy for p in poly]
                if max(xs) < 0 or min(xs) > W or max(ys) < 0 or min(ys) > H: continue
                groups[key].append('M' + ' '.join('%d %d' % (round(x), round(y)) for x, y in zip(xs, ys)) + 'Z')
    return groups

W, H = 200, 100
g = calcada(W, H, 12.5, 15, 7)
def calc_svg(joint, d1, d2, l1, l2):
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % (W, H, W, H)
            + '<rect width="%d" height="%d" fill="%s"/>' % (W, H, joint)
            + '<path fill="%s" d="%s"/>' % (l1, ''.join(g['l1']))
            + '<path fill="%s" d="%s"/>' % (l2, ''.join(g['l2']))
            + '<path fill="%s" d="%s"/>' % (d1, ''.join(g['d1']))
            + '<path fill="%s" d="%s"/>' % (d2, ''.join(g['d2']))
            + '</svg>')
w('calcada-light.svg', calc_svg('#CDC5B2', '#1B1E26', '#2B2F3A', '#F7F5EF', '#ECE8DE'))
w('calcada-dark.svg', calc_svg('#05070B', '#161B26', '#1E2431', '#BDB8AD', '#AAA59A'))

# ---------------- Stitched shield, uneven ----------------
def cubic(p0, p1, p2, p3, n=40):
    return [tuple((1 - t) ** 3 * p0[i] + 3 * (1 - t) ** 2 * t * p1[i] + 3 * (1 - t) * t * t * p2[i] + t ** 3 * p3[i] for i in (0, 1)) for t in [k / n for k in range(1, n + 1)]]

def line(p, q, n=30):
    return [(p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n) for k in range(1, n + 1)]

def shield(x0, y0, x1, ymid, ybot, cx):
    # flat top, straight sides to ymid, rounded bottom to point (cx, ybot)
    pts = [(x0, y0)]
    pts += line((x0, y0), (x1, y0))
    pts += line((x1, y0), (x1, ymid))
    ww = x1 - x0; hh = ybot - ymid
    pts += cubic((x1, ymid), (x1, ymid + hh * .5), (cx + ww * .23, ybot - hh * .03), (cx, ybot))
    pts += cubic((cx, ybot), (cx - ww * .23, ybot - hh * .03), (x0, ymid + hh * .5), (x0, ymid))
    pts += line((x0, ymid), (x0, y0))
    return pts

def stitches(pts, rnd, dash, gap, jit, wob, width):
    # arc-length param
    L = [0]
    for i in range(1, len(pts)):
        L.append(L[-1] + math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
    tot = L[-1]
    def at(s):
        s = s % tot
        for i in range(1, len(L)):
            if L[i] >= s:
                t = (s - L[i - 1]) / ((L[i] - L[i - 1]) or 1)
                p, q = pts[i - 1], pts[i]
                return (p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1]))
        return pts[-1]
    out = []
    s = rnd.uniform(0, gap[1])
    start = s
    while s < start + tot - dash[0] - gap[0]:
        d = rnd.uniform(*dash)
        a = at(s); b = at(s + d); m = at(s + d / 2)
        nx, ny = -(b[1] - a[1]), b[0] - a[0]
        nl = math.hypot(nx, ny) or 1
        nx, ny = nx / nl, ny / nl
        j1 = rnd.uniform(-jit, jit); j2 = rnd.uniform(-jit, jit); wb = rnd.uniform(-wob, wob)
        A_ = (a[0] + nx * j1, a[1] + ny * j1); B_ = (b[0] + nx * j2, b[1] + ny * j2)
        C_ = (m[0] + nx * (wb + (j1 + j2) / 2) * 2, m[1] + ny * (wb + (j1 + j2) / 2) * 2)
        sw = rnd.uniform(*width)
        out.append((A_, C_, B_, sw))
        s += d + rnd.uniform(*gap)
    return out

def stitch_paths(st, color, frac=1.0, guide=None):
    n = len(st); k = round(n * frac)
    o = ''
    for i, (a, c, b, sw) in enumerate(st):
        if i < k:
            o += '<path d="M%.1f %.1fQ%.1f %.1f %.1f %.1f" stroke-width="%.1f"/>' % (a[0], a[1], c[0], c[1], b[0], b[1], sw)
    return '<g fill="none" stroke="%s" stroke-linecap="round">%s</g>' % (color, o)

rnd = random.Random(21)
outer = shield(8, 9, 112, 70, 132, 60)
inner = shield(30, 35, 90, 74, 111, 60)
st_outer = stitches(outer, rnd, (6.5, 13), (4.5, 8.5), .9, .7, (3.0, 4.0))
st_inner = stitches(inner, rnd, (5, 10), (3.5, 6.5), .8, .6, (2.6, 3.3))
quinas = []
for (qx, qy) in [(60, 51), (43, 70), (60, 70), (77, 70), (60, 89)]:
    q = shield(qx - 6.5, qy - 8, qx + 6.5, qy + 1, qy + 9, qx)
    quinas.append(stitches(q, rnd, (3, 5.5), (2.2, 3.6), .45, .35, (1.9, 2.4)))

def shield_svg(color, frac=1.0, guide=None):
    body = ''
    if guide:
        def poly(pts):
            return 'M' + ' '.join('%.1f %.1f' % p for p in pts) + 'Z'
        body += '<path d="%s %s" fill="none" stroke="%s" stroke-width="1.2" stroke-dasharray="1.5 3"/>' % (poly(outer), poly(inner), guide)
    # stitch order: outer, inner, quinas -> fraction applied across the whole sequence
    seq = st_outer + st_inner + [x for q in quinas for x in q]
    body += stitch_paths(seq, color, frac)
    return '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="140" viewBox="0 0 120 140">' + body + '</svg>'

w('shield-cobalt.svg', shield_svg('#1A4C9C'))
w('shield-light.svg', shield_svg('#8EB0EA'))
w('shield-white.svg', shield_svg('#FFFFFF'))
for i, f in enumerate((.34, .67, 1.0), 1):
    w('trust-%d-light.svg' % i, shield_svg('#1A4C9C', f, '#9AA3B5'))
    w('trust-%d-dark.svg' % i, shield_svg('#8EB0EA', f, '#4C5672'))

# favicon: solid
w('favicon.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M3 3H29V17C29 25 23 30 16 30C9 30 3 25 3 17Z" fill="#1A4C9C"/><g fill="#fff"><rect x="14" y="8" width="4" height="4.5" rx="1.2"/><rect x="8.5" y="13.5" width="4" height="4.5" rx="1.2"/><rect x="14" y="13.5" width="4" height="4.5" rx="1.2"/><rect x="19.5" y="13.5" width="4" height="4.5" rx="1.2"/><rect x="14" y="19" width="4" height="4.5" rx="1.2"/></g></svg>')

# ---------------- Azulejo category tiles (48x48, four-fold, join at corners) ----------------
def tile(bg, b1, b2, body):
    return '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" fill="%s"/>%s</svg>' % (bg, body.replace('B1', b1).replace('B2', b2).replace('BG', bg))

corners = lambda r, col: ''.join('<circle cx="%d" cy="%d" r="%s" fill="%s"/>' % (x, y, r, col) for x in (0, 48) for y in (0, 48))
motifs = {
    # footwear: eight-point star
    'calcado': corners(10, 'B2') + '<path d="M24 8L28.5 19.5L40 24L28.5 28.5L24 40L19.5 28.5L8 24L19.5 19.5Z" fill="B1"/><path d="M24 12.7L32 16L35.3 24L32 32L24 35.3L16 32L12.7 24L16 16Z" fill="none" stroke="B1" stroke-width="1.6"/><circle cx="24" cy="24" r="3" fill="BG"/>',
    # clothing: woven bands
    'vestuario': '<path d="M0 10H48M0 38H48M10 0V48M38 0V48" stroke="B2" stroke-width="5"/><path d="M0 24H48M24 0V48" stroke="B1" stroke-width="7"/><rect x="18" y="18" width="12" height="12" fill="BG" transform="rotate(45 24 24)"/><rect x="21" y="21" width="6" height="6" fill="B1" transform="rotate(45 24 24)"/>',
    # ceramics: quatrefoil
    'ceramica': corners(9, 'B1') + '<g fill="B2"><circle cx="24" cy="15" r="7"/><circle cx="24" cy="33" r="7"/><circle cx="15" cy="24" r="7"/><circle cx="33" cy="24" r="7"/></g><circle cx="24" cy="24" r="6" fill="B1"/><circle cx="24" cy="24" r="2.2" fill="BG"/>',
    # home: nested diamond + arcs
    'casa': '<path d="M24 4L44 24L24 44L4 24Z" fill="none" stroke="B1" stroke-width="3"/><path d="M24 13L35 24L24 35L13 24Z" fill="B1"/><path d="M0 14A14 14 0 0 0 14 0M34 0A14 14 0 0 0 48 14M48 34A14 14 0 0 0 34 48M14 48A14 14 0 0 0 0 34" fill="none" stroke="B2" stroke-width="3"/><circle cx="24" cy="24" r="3" fill="BG"/>',
    # food: four leaves to the corners
    'alimentacao': '<g fill="B1"><ellipse cx="13" cy="13" rx="11" ry="4.5" transform="rotate(45 13 13)"/><ellipse cx="35" cy="13" rx="11" ry="4.5" transform="rotate(-45 35 13)"/><ellipse cx="13" cy="35" rx="11" ry="4.5" transform="rotate(-45 13 35)"/><ellipse cx="35" cy="35" rx="11" ry="4.5" transform="rotate(45 35 35)"/></g><circle cx="24" cy="24" r="5.5" fill="B2"/><g fill="B2"><circle cx="24" cy="2" r="3"/><circle cx="24" cy="46" r="3"/><circle cx="2" cy="24" r="3"/><circle cx="46" cy="24" r="3"/></g>',
    # cosmetics: scallops
    'cosmetica': '<g fill="none" stroke="B1" stroke-width="3"><path d="M0 24A12 12 0 0 1 24 24A12 12 0 0 1 48 24"/><path d="M0 48A12 12 0 0 1 24 48A12 12 0 0 1 48 48"/><path d="M-12 12A12 12 0 0 1 12 12A12 12 0 0 1 36 12A12 12 0 0 1 60 12" stroke="B2"/><path d="M-12 36A12 12 0 0 1 12 36A12 12 0 0 1 36 36A12 12 0 0 1 60 36" stroke="B2"/></g>',
}
for k, body in motifs.items():
    w('tile-%s-light.svg' % k, tile('#F4F6FB', '#1A4C9C', '#7C9BD1', body))
    w('tile-%s-dark.svg' % k, tile('#16203A', '#8EB0EA', '#3E5A94', body))
