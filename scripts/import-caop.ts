#!/usr/bin/env node
/**
 * Imports municipality geometry from the official CAOP (Carta Administrativa
 * Oficial de Portugal, DGT, CC BY 4.0) and derives what the site needs:
 *
 * - a centroid for every municipality, written into data/taxonomy/regions.yaml
 *   (the map puts a brand at its municipality centroid, never at an address);
 * - simplified district shapes in data/geo/districts.geojson, dissolved from
 *   the municipalities so that neighbouring districts share their borders.
 *
 * Run by hand when CAOP changes, not in CI: it needs the network and runs
 * mapshaper through `pnpm dlx`.
 *
 *   node scripts/import-caop.ts
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTaxonomy } from '@fep/schema';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(repoRoot, 'data');
const regionsFile = join(dataDir, 'taxonomy', 'regions.yaml');
const outFile = join(dataDir, 'geo', 'districts.geojson');

const SERVICE = 'https://infogeo.dgterritorio.gov.pt/arcgis/rest/services/Hosted';
const MAPSHAPER = 'mapshaper@0.7.60';

/** One ArcGIS layer per CAOP dataset; the islands are published separately. */
const LAYERS = [
  { url: `${SERVICE}/caop2025_municipios/FeatureServer/1005`, name: 'municipio', district: 'distrito_i' },
  { url: `${SERVICE}/Concelhos_Arquip%C3%A9lago_da_Madeira/FeatureServer/2`, name: 'concelho', district: null, region: 'madeira' },
  { url: `${SERVICE}/Concelhos_RAA/FeatureServer/12`, name: 'concelho', district: null, region: 'acores' },
] as const;

type Position = [number, number];
type Ring = Position[];
interface Feature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] };
}

/** "Vila Nova de Gaia" → "vila-nova-de-gaia", the way taxonomy ids are written. */
const toId = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

async function fetchLayer(url: string, fields: string[]): Promise<Feature[]> {
  const query = new URLSearchParams({
    where: '1=1',
    outFields: fields.join(','),
    outSR: '4326',
    returnGeometry: 'true',
    f: 'geojson',
  });
  const response = await fetch(`${url}/query?${query}`);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const body = (await response.json()) as { features?: Feature[]; error?: unknown };
  if (!body.features) throw new Error(`${url}: ${JSON.stringify(body.error)}`);
  return body.features;
}

/** Signed area and centroid of one ring, planar in lon/lat — fine at municipality size. */
function ringStats(ring: Ring): { area: number; x: number; y: number } {
  let area = 0;
  let x = 0;
  let y = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x0, y0] = ring[j]!;
    const [x1, y1] = ring[i]!;
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    x += (x0 + x1) * cross;
    y += (y0 + y1) * cross;
  }
  area /= 2;
  return area === 0 ? { area: 0, x: 0, y: 0 } : { area, x: x / (6 * area), y: y / (6 * area) };
}

function centroid(feature: Feature): [number, number] {
  const polygons =
    feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  let area = 0;
  let x = 0;
  let y = 0;
  // Holes come back with the opposite winding, so summing signed areas subtracts them.
  for (const polygon of polygons) {
    for (const ring of polygon) {
      const stats = ringStats(ring);
      area += stats.area;
      x += stats.x * stats.area;
      y += stats.y * stats.area;
    }
  }
  const round = (value: number): number => Math.round(value * 1e4) / 1e4;
  return [round(y / area), round(x / area)];
}

/** CAOP names that differ from ours beyond accents and case. */
const ALIASES: Record<string, string> = {
  'acores/calheta-de-sao-jorge': 'calheta-sao-jorge',
};

const taxonomy = loadTaxonomy(dataDir);
const districtIds = new Set(taxonomy.regions.map((region) => region.id));

/**
 * Our id for a CAOP municipality. Names repeated across districts carry a
 * suffix in our ids (`lagoa-acores`), so the match is on the name, within the
 * district.
 */
function municipalityId(district: string, name: string): string | undefined {
  const key = toId(name);
  const alias = ALIASES[`${district}/${key}`];
  const region = taxonomy.regions.find((r) => r.id === district);
  return region?.municipalities.find(
    (m) => m.id === (alias ?? key) || toId(m.name) === key,
  )?.id;
}

const merged: Feature[] = [];
const centroids = new Map<string, [number, number]>(); // "district/municipality"
const problems: string[] = [];

for (const layer of LAYERS) {
  const fields = [layer.name, ...(layer.district ? [layer.district] : [])];
  const features = await fetchLayer(layer.url, fields);
  for (const feature of features) {
    const name = String(feature.properties[layer.name] ?? '');
    const district =
      'region' in layer ? layer.region : toId(String(feature.properties[layer.district!] ?? ''));
    if (!districtIds.has(district)) {
      problems.push(`unknown district "${district}" for ${name}`);
      continue;
    }
    const municipality = municipalityId(district, name);
    if (!municipality) {
      problems.push(`no municipality named "${name}" in ${district}`);
      continue;
    }
    centroids.set(`${district}/${municipality}`, centroid(feature));
    merged.push({ type: 'Feature', properties: { district }, geometry: feature.geometry });
  }
}

const expected = taxonomy.regions.reduce((total, region) => total + region.municipalities.length, 0);
if (centroids.size !== expected) {
  problems.push(`matched ${centroids.size} of ${expected} municipalities`);
}
if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}

// Centroids: rewrite only the municipality lines, so comments and order survive.
let currentDistrict = '';
const lines = readFileSync(regionsFile, 'utf8').split('\n');
const updated = lines.map((line) => {
  const district = /^- id: (\S+)/.exec(line);
  if (district) currentDistrict = district[1]!;
  const municipality = /^(\s+- \{ id: ([^,]+), name: ([^,}]+?))(, centroid: \[[^\]]*\])? \}$/.exec(line);
  if (!municipality) return line;
  const point = centroids.get(`${currentDistrict}/${municipality[2]}`);
  return point ? `${municipality[1]}, centroid: [${point[0]}, ${point[1]}] }` : line;
});
writeFileSync(regionsFile, updated.join('\n'));

// District shapes: dissolve and simplify on a shared topology, so borders still meet.
const work = mkdtempSync(join(tmpdir(), 'caop-'));
try {
  const input = join(work, 'municipalities.geojson');
  writeFileSync(input, JSON.stringify({ type: 'FeatureCollection', features: merged }));
  mkdirSync(dirname(outFile), { recursive: true });
  execFileSync(
    'pnpm',
    [
      'dlx',
      MAPSHAPER,
      input,
      '-dissolve',
      'district',
      '-simplify',
      '0.4%',
      'keep-shapes',
      '-o',
      outFile,
      'format=geojson',
      'precision=0.001',
    ],
    { stdio: 'inherit' },
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}

const size = readFileSync(outFile).length;
console.log(
  `${centroids.size} municipality centroids written to data/taxonomy/regions.yaml; ` +
    `${districtIds.size} district shapes (${Math.round(size / 1024)} KB) to data/geo/districts.geojson`,
);
