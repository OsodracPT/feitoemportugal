import json, math, sys
import shapely
from shapely.geometry import shape, MultiPolygon, Polygon
from shapely.ops import unary_union
from shapely import affinity

src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src))
ids = {'Aveiro': 'AV', 'Beja': 'BE', 'Braga': 'BR', 'Castelo Branco': 'CB', 'Coimbra': 'CO', 'Guarda': 'GU', 'Leiria': 'LE', 'Lisboa': 'LI', 'Portalegre': 'PL', 'Porto': 'PO', 'Viana do Castelo': 'VC', 'Vila Real': 'VR', 'Viseu': 'VS', 'Bragança': 'BG', 'Évora': 'EV', 'Santarém': 'SA', 'Setúbal': 'SE', 'Faro': 'FA'}
geoms, names = [], []
k = math.cos(math.radians(39.6))
for f in d['features']:
    g = shape(f['geometry'])
    g = affinity.scale(g, xfact=k, yfact=-1, origin=(0, 0))
    # drop tiny islets
    if isinstance(g, MultiPolygon):
        g = MultiPolygon([p for p in g.geoms if p.area > 0.0004])
    geoms.append(g); names.append(f['properties']['name'])
u = unary_union(geoms)
minx, miny, maxx, maxy = u.bounds
W = 100.0
s = W / (maxx - minx)
H = (maxy - miny) * s
geoms = [affinity.scale(affinity.translate(g, -minx, -miny), s, s, origin=(0, 0)) for g in geoms]
simp = shapely.coverage_simplify(geoms, tolerance=float(sys.argv[3]))
def path(g):
    polys = g.geoms if hasattr(g, 'geoms') else [g]
    o = ''
    for p in polys:
        if p.is_empty or p.area < 0.3: continue
        c = list(p.exterior.coords)[:-1]
        o += 'M' + ' '.join('%.1f %.1f' % xy for xy in c) + 'Z'
    return o
res = {'w': W, 'h': round(H, 1), 'districts': [], 'outline': path(unary_union(simp).buffer(1.8).simplify(0.5))}
for n, g in zip(names, simp):
    c = g.representative_point()
    res['districts'].append({'id': ids[n], 'name': n, 'd': path(g), 'cx': round(c.x, 1), 'cy': round(c.y, 1)})
json.dump(res, open(out, 'w'), ensure_ascii=False)
print(H, sum(len(x['d']) for x in res['districts']), len(res['outline']))
