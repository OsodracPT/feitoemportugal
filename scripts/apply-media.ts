#!/usr/bin/env node
/**
 * Copies an approved logo or photo into assets/brands/<slug>/, writes the
 * brand's `media` block and logs where the image came from in
 * docs/leads/media-sources.csv. Every image on the site has a row there.
 *
 *   node scripts/apply-media.ts logo famo=cand-2.svg [more=cand-1.png ...]
 *       a candidate from .cache/media/ (scripts/fetch-logos.ts)
 *
 *   node scripts/apply-media.ts photo famo <file-or-url> --source <page-url> --kind press-kit
 *       a photo the brand published for press use (--kind press-kit), sent us
 *       with permission (--kind brand-supplied), or — failing those — a product
 *       shot from the brand's own site (--kind brand-site), capped at three and
 *       replaced as soon as the brand's own photos arrive (docs §3.8). --source
 *       is the press page, the issue/e-mail reference, or (for brand-site) the
 *       product page on the brand's own domain, never a guess.
 */
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  MEDIA_EXTENSIONS,
  imageSize,
  loadBrands,
  setBrandMedia,
  brokenSvg,
  unsafeSvg,
  validateMedia,
} from '@fep/schema';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(repoRoot, 'data');
const assetsDir = join(repoRoot, 'assets');
const cacheDir = join(repoRoot, '.cache/media');
const sourcesFile = join(repoRoot, 'docs/leads/media-sources.csv');
const today = new Date().toISOString().slice(0, 10);

const PHOTO_KINDS = ['press-kit', 'brand-supplied', 'brand-site'];
// A `brand-site` shot rests on credit and takedown, not a licence, so docs §3.8
// caps it at three per brand; press-kit and brand-supplied photos are not capped
// beyond MAX_PHOTOS and replace brand-site shots when they arrive.
const MAX_BRAND_SITE_PHOTOS = 3;
// Docs §3.8 rule 4: at least 800 px on the short side, or the shot reads as a
// thumbnail in the gallery grid.
const MIN_PHOTO_EDGE = 800;
// Marketplaces, resellers and socials a photo may never be taken from (docs
// §3.8): a brand-site shot comes from the brand's own domain, and the same image
// turning up on one of these is a dropshipping red flag worth stopping for.
const FORBIDDEN_PHOTO_HOSTS = [
  'aliexpress',
  'alicdn',
  'amazon',
  'mercadolibre',
  'mercadolivre',
  'etsy',
  'ebay',
  'wish.com',
  'shein',
  'temu',
  'instagram',
  'cdninstagram',
  'facebook',
  'fbcdn',
  'pinterest',
  'tiktok',
];

function fail(message: string): never {
  console.error(`ERROR  ${message}`);
  process.exit(1);
}

/** Hostname without a leading `www.`, lower-cased; '' when not a URL. */
function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

/** True when `candidate` is the same site as `site` or a subdomain of it. */
function sameSite(candidate: string, site: string): boolean {
  const a = host(candidate);
  const b = host(site);
  return a !== '' && b !== '' && (a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`));
}

/** How many `brand-site` photos a brand already has, from the sources log. */
function brandSiteCount(slug: string): number {
  if (!existsSync(sourcesFile)) return 0;
  return readFileSync(sourcesFile, 'utf8')
    .split('\n')
    .slice(1)
    .filter((line) => {
      const [rowSlug, , rowKind] = line.split(',');
      return rowSlug === slug && rowKind === 'brand-site';
    }).length;
}

const csvCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

function logSource(row: { slug: string; file: string; kind: string; source: string }): void {
  if (!existsSync(sourcesFile)) writeFileSync(sourcesFile, 'slug,file,kind,source_url,added\n');
  appendFileSync(sourcesFile, `${[row.slug, row.file, row.kind, row.source, today].map(csvCell).join(',')}\n`);
}

/** Refuses anything the site would not serve or the checks would reject. */
function checkFile(bytes: Uint8Array, name: string, kind: 'logo' | 'photo'): void {
  const ext = extname(name).toLowerCase();
  if (!(MEDIA_EXTENSIONS as readonly string[]).includes(ext)) fail(`${name}: unsupported format "${ext}"`);
  if (ext === '.svg') {
    const reason = unsafeSvg(new TextDecoder().decode(bytes));
    if (reason) fail(`${name}: unsafe SVG (${reason}); redraw or export a clean copy first`);
    const broken = brokenSvg(new TextDecoder().decode(bytes));
    if (broken) fail(`${name}: broken SVG (${broken}); pick another candidate or fetch the brand again`);
  }
  if (kind === 'photo') {
    if (bytes.length > MAX_PHOTO_BYTES) fail(`${name}: larger than 2 MB, resize it first`);
    const size = imageSize(bytes);
    if (size && Math.min(size.width, size.height) < MIN_PHOTO_EDGE) {
      fail(`${name}: ${size.width}×${size.height}, under ${MIN_PHOTO_EDGE} px on the short side — find a larger shot`);
    }
  }
}

function brandFile(slug: string) {
  const entry = loadBrands(dataDir).find(({ data }) => data.slug === slug);
  if (!entry) fail(`no brand "${slug}" in data/brands/`);
  return entry;
}

/** Writes `media` and bumps `meta.updated`, leaving the rest of the file as is. */
function writeMedia(slug: string, media: { logo?: string; photos: string[] }): void {
  const path = join(dataDir, 'brands', `${slug}.yaml`);
  const text = setBrandMedia(readFileSync(path, 'utf8'), media).replace(
    /^(meta:\n(?: {2}.*\n)*? {2}updated: ).*$/m,
    `$1${today}`,
  );
  writeFileSync(path, text);
}

function applyLogo(pair: string): void {
  const [slug, candidate] = pair.split('=');
  if (!slug || !candidate) fail(`expected <slug>=<candidate file>, got "${pair}"`);
  const candidates = JSON.parse(readFileSync(join(cacheDir, 'candidates.json'), 'utf8'));
  const found = candidates[slug]?.candidates?.find((c: { file: string }) => c.file === candidate);
  if (!found) fail(`${candidate} is not a candidate for ${slug}; run scripts/fetch-logos.ts ${slug}`);

  const { data: brand } = brandFile(slug);
  const bytes = readFileSync(join(cacheDir, slug, candidate));
  checkFile(bytes, candidate, 'logo');

  const folder = join(assetsDir, 'brands', slug);
  mkdirSync(folder, { recursive: true });
  // One logo per brand: a new one in another format replaces the old file.
  for (const name of existsSync(folder) ? readdirSync(folder) : []) {
    if (name.startsWith('logo.')) rmSync(join(folder, name));
  }
  const file = `logo${extname(candidate).toLowerCase()}`;
  writeFileSync(join(folder, file), bytes);
  writeMedia(slug, { logo: file, photos: brand.media?.photos ?? [] });
  logSource({ slug, file, kind: 'logo', source: found.source });
  console.log(`${slug}: assets/brands/${slug}/${file}`);
}

async function applyPhoto(slug: string, input: string, source: string, kind: string): Promise<void> {
  if (!PHOTO_KINDS.includes(kind)) fail(`--kind must be one of ${PHOTO_KINDS.join(', ')}`);
  if (!source) fail('--source is required: the press page, or where the brand sent the photo');
  const { data: brand } = brandFile(slug);
  const photos = brand.media?.photos ?? [];
  if (photos.length >= MAX_PHOTOS) fail(`${slug} already has ${MAX_PHOTOS} photos`);

  // A product shot lifted from a marketplace, reseller or social is never an
  // allowed source; the same image on one is a dropshipping red flag (docs §3.8).
  for (const url of [input, source]) {
    const forbidden = FORBIDDEN_PHOTO_HOSTS.find((bad) => host(url).includes(bad));
    if (forbidden) fail(`${url}: ${forbidden} is not an allowed source — brand's own site only, and a marketplace match is a red flag to raise with a maintainer`);
  }

  if (kind === 'brand-site') {
    if (!sameSite(source, brand.website)) {
      fail(`brand-site --source must be on ${host(brand.website)} (the brand's own domain), got ${host(source) || source}`);
    }
    const existing = brandSiteCount(slug);
    if (existing >= MAX_BRAND_SITE_PHOTOS) {
      fail(`${slug} already has ${existing} brand-site photos (max ${MAX_BRAND_SITE_PHOTOS}); a press-kit or brand-supplied photo would replace one`);
    }
  }

  let bytes: Uint8Array;
  let name = basename(new URL(input, 'file:///').pathname);
  if (/^https?:\/\//.test(input)) {
    const response = await fetch(input, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) fail(`HTTP ${response.status} for ${input}`);
    bytes = new Uint8Array(await response.arrayBuffer());
    const type = response.headers.get('content-type') ?? '';
    if (!extname(name)) name += /png/.test(type) ? '.png' : /webp/.test(type) ? '.webp' : '.jpg';
  } else {
    bytes = readFileSync(input);
  }
  checkFile(bytes, name, 'photo');

  const folder = join(assetsDir, 'brands', slug);
  mkdirSync(folder, { recursive: true });
  let index = 1;
  while (existsSync(join(folder, `foto-${index}${extname(name).toLowerCase()}`)) || photos.some((p) => p.startsWith(`foto-${index}.`))) index++;
  const file = `foto-${index}${extname(name).toLowerCase().replace('.jpeg', '.jpg')}`;
  if (/^https?:\/\//.test(input)) writeFileSync(join(folder, file), bytes);
  else copyFileSync(input, join(folder, file));
  writeMedia(slug, { logo: brand.media?.logo, photos: [...photos, file] });
  logSource({ slug, file, kind, source });
  console.log(`${slug}: assets/brands/${slug}/${file}`);
}

const [mode, ...rest] = process.argv.slice(2);
const option = (name: string) => {
  const index = rest.indexOf(name);
  return index === -1 ? '' : (rest[index + 1] ?? '');
};

if (mode === 'logo' && rest.length > 0) {
  for (const pair of rest) applyLogo(pair);
} else if (mode === 'photo' && rest.length >= 2) {
  await applyPhoto(rest[0]!, rest[1]!, option('--source'), option('--kind'));
} else {
  fail('usage: apply-media.ts logo <slug>=<candidate> … | photo <slug> <file-or-url> --source <url> --kind press-kit|brand-supplied|brand-site');
}

// Same checks as `pnpm validate`, on the brands just touched.
const touched = new Set(mode === 'logo' ? rest.map((pair) => pair.split('=')[0]) : [rest[0]]);
const issues = validateMedia(
  loadBrands(dataDir).filter(({ data }) => touched.has(data.slug)),
  assetsDir,
);
for (const issue of issues) console.log(`${issue.level === 'error' ? 'ERROR' : 'warn '}  ${issue.file} → ${issue.path}: ${issue.message}`);
if (issues.some((issue) => issue.level === 'error')) process.exitCode = 1;
