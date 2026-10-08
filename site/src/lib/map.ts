/**
 * District map geometry, projected to SVG paths at build time.
 *
 * Server-only: it reads data/geo from disk and uses d3-geo, and neither may
 * reach the browser bundle. The page ships finished `<path d>`
 * strings and no mapping code at all.
 */
import { geoConicConformal, geoMercator, type GeoProjection } from 'd3-geo';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import { loadDistrictShapes, type Brand, type Region } from '@fep/schema';
import { regions } from './data.ts';

const dataDir = import.meta.env.DATA_DIR;
const shapes = loadDistrictShapes(dataDir);

/** viewBox units. Mainland Portugal is about twice as tall as it is wide. */
export const MAP_WIDTH = 300;
export const MAP_HEIGHT = 440;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The islands are drawn as insets in the empty sea to the west, the usual
 * way of fitting Portugal on one page. Each gets a projection of its own.
 */
const FRAMES: Record<'mainland' | 'acores' | 'madeira', Box> = {
  mainland: { x: 120, y: 6, width: 174, height: 428 },
  acores: { x: 4, y: 250, width: 108, height: 64 },
  madeira: { x: 34, y: 330, width: 78, height: 48 },
};

export interface MapDistrict {
  id: string;
  /** Path data in viewBox units. */
  d: string;
}

export interface MapInset extends Box {
  id: string;
}

type ShapeFeature = Feature<Polygon | MultiPolygon, { district: string }>;

const features = shapes.features as ShapeFeature[];
const frameOf = (district: string): keyof typeof FRAMES =>
  district === 'acores' || district === 'madeira' ? district : 'mainland';

/**
 * The file follows RFC 7946 (exterior rings counter-clockwise); d3-geo works on
 * the sphere and reads that as "everything except the district", so fitting
 * needs the rings reversed.
 */
function rewound(feature: ShapeFeature): ShapeFeature {
  const reverse = (rings: Polygon['coordinates']) => rings.map((ring) => [...ring].reverse());
  const geometry: Polygon | MultiPolygon =
    feature.geometry.type === 'Polygon'
      ? { type: 'Polygon', coordinates: reverse(feature.geometry.coordinates) }
      : { type: 'MultiPolygon', coordinates: feature.geometry.coordinates.map(reverse) };
  return { ...feature, geometry };
}

function fitted(projection: GeoProjection, frame: Box, members: ShapeFeature[]): GeoProjection {
  return projection.fitExtent(
    [
      [frame.x, frame.y],
      [frame.x + frame.width, frame.y + frame.height],
    ],
    { type: 'FeatureCollection', features: members.map(rewound) },
  );
}

const projections = Object.fromEntries(
  (Object.keys(FRAMES) as (keyof typeof FRAMES)[]).map((key) => {
    const members = features.filter((feature) => frameOf(feature.properties.district) === key);
    // A conic projection keeps the mainland's shape; the islands are small
    // enough that Mercator is indistinguishable.
    const base = key === 'mainland' ? geoConicConformal().parallels([37, 42]).rotate([8, 0]) : geoMercator();
    return [key, fitted(base, FRAMES[key], members)];
  }),
) as Record<keyof typeof FRAMES, GeoProjection>;

/** One decimal of a viewBox unit is far below a pixel at the size the map is shown. */
const round = (value: number): number => Math.round(value * 10) / 10;

/**
 * SVG path data for a polygon set: vertices only (no curve resampling, which
 * d3's geoPath would add), rounded, repeated points dropped, relative moves.
 * About half the size of geoPath's output for the same drawing.
 */
function pathData(projection: GeoProjection, geometry: Polygon | MultiPolygon): string {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  let d = '';
  for (const ring of polygons.flat()) {
    let previous: [number, number] | null = null;
    let part = '';
    for (const position of ring) {
      const projected = projection([position[0]!, position[1]!]);
      if (!projected) continue;
      const point: [number, number] = [round(projected[0]), round(projected[1])];
      if (!previous) {
        part = `M${point[0]} ${point[1]}`;
      } else {
        const dx = round(point[0] - previous[0]);
        const dy = round(point[1] - previous[1]);
        if (dx === 0 && dy === 0) continue;
        part += `l${dx} ${dy}`;
      }
      previous = point;
    }
    if (part) d += `${part}z`;
  }
  // "l1.5 -0.3" → "l1.5-.3": the shortest form SVG still parses.
  return d.replace(/ -/g, '-').replace(/(^|[^\d])0\./g, '$1.');
}

export const mapDistricts: MapDistrict[] = features
  .map((feature) => ({
    id: feature.properties.district,
    d: pathData(projections[frameOf(feature.properties.district)], feature.geometry),
  }))
  // Same order as the taxonomy, so keyboard focus moves predictably.
  .sort(
    (a, b) =>
      regions.findIndex((region) => region.id === a.id) -
      regions.findIndex((region) => region.id === b.id),
  );

export const mapInsets: MapInset[] = (['acores', 'madeira'] as const).map((id) => ({
  id,
  ...FRAMES[id],
}));

/** A municipality centroid in viewBox units, for the dots on region pages. */
export function projectPoint(district: string, [lat, lon]: [number, number]): [number, number] {
  const point = projections[frameOf(district)]([lon, lat]) ?? [0, 0];
  return [Math.round(point[0] * 10) / 10, Math.round(point[1] * 10) / 10];
}

export interface MapDot {
  x: number;
  y: number;
  count: number;
  label: string;
}

/**
 * One dot per municipality of `region` that has brands, on its centroid and
 * never on an address. Brands without a municipality add no dot.
 */
export function municipalityDots(region: Region, brands: Brand[]): MapDot[] {
  const perMunicipality = new Map<string, number>();
  for (const brand of brands) {
    const id = brand.location?.municipality;
    if (id) perMunicipality.set(id, (perMunicipality.get(id) ?? 0) + 1);
  }
  return region.municipalities.flatMap((municipality) => {
    const count = perMunicipality.get(municipality.id) ?? 0;
    if (count === 0 || !municipality.centroid) return [];
    const [x, y] = projectPoint(region.id, municipality.centroid);
    return [{ x, y, count, label: municipality.name }];
  });
}
