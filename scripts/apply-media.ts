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
 *       a photo the brand published for press use (--kind press-kit) or sent
 *       us with permission (--kind brand-supplied). --source is the press page
 *       or the issue/e-mail reference, never a guess.
 */
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  MEDIA_EXTENSIONS,
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

const PHOTO_KINDS = ['press-kit', 'brand-supplied'];

function fail(message: string): never {
  console.error(`ERROR  ${message}`);
  process.exit(1);
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
  if (kind === 'photo' && bytes.length > MAX_PHOTO_BYTES) fail(`${name}: larger than 2 MB, resize it first`);
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
  fail('usage: apply-media.ts logo <slug>=<candidate> … | photo <slug> <file-or-url> --source <url> --kind press-kit|brand-supplied');
}

// Same checks as `pnpm validate`, on the brands just touched.
const touched = new Set(mode === 'logo' ? rest.map((pair) => pair.split('=')[0]) : [rest[0]]);
const issues = validateMedia(
  loadBrands(dataDir).filter(({ data }) => touched.has(data.slug)),
  assetsDir,
);
for (const issue of issues) console.log(`${issue.level === 'error' ? 'ERROR' : 'warn '}  ${issue.file} → ${issue.path}: ${issue.message}`);
if (issues.some((issue) => issue.level === 'error')) process.exitCode = 1;
