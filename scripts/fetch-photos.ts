#!/usr/bin/env node
/**
 * Finds product-shot candidates on each brand's own website and downloads them
 * into .cache/photos/ for a maintainer to review. Nothing here touches data/ or
 * assets/: approving a candidate is `scripts/apply-media.ts photo ... --kind
 * brand-site`, which also enforces the docs §3.8 rules (own domain, at most
 * three such shots, 800 px on the short side).
 *
 *   node scripts/fetch-photos.ts                 published brands without photos
 *   node scripts/fetch-photos.ts semogue vibae   only these
 *   node scripts/fetch-photos.ts --drafts        drafts too
 *   node scripts/fetch-photos.ts --limit 10
 *
 * Candidates come from the shop's own product feed where it publishes one
 * (Shopify's /products.json, WooCommerce's Store API), else from the home page's
 * JSON-LD and og:image. Every candidate keeps the product page it belongs to,
 * which is the --source apply-media.ts needs. Runs accumulate in
 * candidates.json, so a second run only redoes the brands asked for.
 *
 * Polite by design: see scripts/lib/polite-fetch.ts.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageSize, loadBrands, type Brand } from '@fep/schema';
import { attr, extension, imgSource, jsonLd, politeFetcher, reason } from './lib/polite-fetch.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = join(repoRoot, '.cache/photos');
const candidatesFile = join(cacheDir, 'candidates.json');

const USER_AGENT = 'FeitoEmPortugalBot/1.0 (+https://github.com/OsodracPT/feitoemportugal; photo finder)';
const MAX_JSON_BYTES = 5 * 1024 * 1024;
const MAX_HTML_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_CANDIDATES = 8;
// Same floor as apply-media.ts: a smaller shot would be refused there anyway.
const MIN_PHOTO_EDGE = 800;
const PRODUCTS_ASKED = 16;
// Downloads tried per brand, kept or not: most home-page images are too small.
const MAX_ATTEMPTS = 16;

/** Where a candidate was found, best first. */
type Kind = 'shopify' | 'woocommerce' | 'json-ld' | 'og-image' | 'home-img';

interface Candidate {
  file: string;
  /** The page the shot belongs to: apply-media.ts --source. */
  source: string;
  image: string;
  kind: Kind;
  title?: string;
  width?: number;
  height?: number;
  bytes: number;
}

interface BrandResult {
  name: string;
  website: string;
  fetched: string;
  candidates: Candidate[];
  error?: string;
}

interface Found {
  kind: Kind;
  image: string;
  source: string;
  title?: string;
}

// --- arguments -------------------------------------------------------------

const args = process.argv.slice(2);
const includeDrafts = args.includes('--drafts');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex === -1 ? Infinity : Number(args[limitIndex + 1]);
const slugs = args.filter((arg, index) => !arg.startsWith('--') && (limitIndex === -1 || index !== limitIndex + 1));

const brands = loadBrands(join(repoRoot, 'data'))
  .map(({ data }) => data)
  .filter((brand) =>
    slugs.length > 0
      ? slugs.includes(brand.slug)
      : !brand.media?.photos?.length && (includeDrafts || brand.status === 'published'),
  )
  .slice(0, limit);

// --- fetching --------------------------------------------------------------

const { get, allowed } = politeFetcher(USER_AGENT, join(cacheDir, '.download'));

async function getJson(url: URL): Promise<unknown> {
  if (!(await allowed(url))) throw new Error(`robots.txt disallows ${url.pathname}`);
  const { body, type } = await get(url.href, MAX_JSON_BYTES);
  if (!/json/i.test(type)) throw new Error(`${url.href} is ${type || 'not JSON'}`);
  return JSON.parse(new TextDecoder().decode(body));
}

// --- finding candidates ----------------------------------------------------

/** First image of each product: the packshot, rarely a size chart. */
async function shopify(home: URL): Promise<Found[]> {
  const data = (await getJson(new URL(`/products.json?limit=${PRODUCTS_ASKED}`, home))) as {
    products?: { handle: string; title: string; images?: { src: string; width?: number; height?: number }[] }[];
  };
  return (data.products ?? []).flatMap((product) => {
    const image = product.images?.find((i) => Math.min(i.width ?? 0, i.height ?? 0) >= MIN_PHOTO_EDGE);
    return image
      ? [{ kind: 'shopify' as const, image: image.src, source: new URL(`/products/${product.handle}`, home).href, title: product.title }]
      : [];
  });
}

async function woocommerce(home: URL): Promise<Found[]> {
  const data = (await getJson(new URL(`/wp-json/wc/store/v1/products?per_page=${PRODUCTS_ASKED}`, home))) as {
    name: string;
    permalink: string;
    images?: { src: string }[];
  }[];
  if (!Array.isArray(data)) return [];
  return data.flatMap((product) => {
    const image = product.images?.[0]?.src;
    return image && product.permalink ? [{ kind: 'woocommerce' as const, image, source: product.permalink, title: product.name }] : [];
  });
}

/**
 * Product images in JSON-LD, then og:image, then the page's own images (logos,
 * icons and anything too small drop out later); the home page is their source.
 */
function homePage(html: string, base: URL): Found[] {
  const found: Found[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const record = node as Record<string, unknown>;
    if (record['@type'] === 'Product') {
      const images = ([] as unknown[]).concat(record.image ?? []);
      const url = images.map((i) => (typeof i === 'string' ? i : (i as { url?: string })?.url)).find(Boolean);
      const page = typeof record.url === 'string' ? record.url : base.href;
      if (url) found.push({ kind: 'json-ld', image: url, source: page, title: String(record.name ?? '') });
    }
    Object.values(record).forEach(walk);
  };
  jsonLd(html).forEach(walk);
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (/^og:image(:secure_url)?$/i.test(attr(tag, 'property') ?? '')) {
      const content = attr(tag, 'content');
      if (content) found.push({ kind: 'og-image', image: content, source: base.href });
    }
  }
  for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
    const url = imgSource(tag);
    if (url && !/logo|icon|svg/i.test(tag)) found.push({ kind: 'home-img', image: url, source: base.href });
  }
  return found;
}

/** Shopify and similar CDNs resize on a query parameter; ask for a full-size copy. */
function fullSize(url: URL): URL {
  url.searchParams.delete('width');
  url.searchParams.delete('height');
  return url;
}

// --- one brand -------------------------------------------------------------

async function collect(brand: Brand): Promise<BrandResult> {
  const result: BrandResult = {
    name: brand.name,
    website: brand.website,
    fetched: new Date().toISOString().slice(0, 10),
    candidates: [],
  };
  const folder = join(cacheDir, brand.slug);
  rmSync(folder, { recursive: true, force: true });
  mkdirSync(folder, { recursive: true });

  const home = new URL(brand.website);
  if (!(await allowed(home))) return { ...result, error: 'robots.txt disallows the home page' };

  // A feed is tried before the page: it names the product page of every shot.
  let found: Found[] = [];
  for (const feed of [shopify, woocommerce]) {
    try {
      found = await feed(home);
      if (found.length > 0) break;
    } catch {
      // Not this platform, or the feed is closed.
    }
  }
  if (found.length === 0) {
    const page = await get(home.href, MAX_HTML_BYTES);
    found = homePage(new TextDecoder().decode(page.body), new URL(page.url));
  }

  const seen = new Set<string>();
  let attempts = 0;
  for (const candidate of found) {
    if (result.candidates.length >= MAX_CANDIDATES || attempts >= MAX_ATTEMPTS) break;
    try {
      const url = fullSize(new URL(candidate.image, home));
      if (!['http:', 'https:'].includes(url.protocol) || seen.has(url.href)) continue;
      seen.add(url.href);
      if (!(await allowed(url))) continue;
      attempts++;
      const image = await get(url.href, MAX_IMAGE_BYTES);
      const ext = extension(image.type, image.url);
      if (!ext || ext === 'svg') continue;
      const size = imageSize(image.body);
      if (size && Math.min(size.width, size.height) < MIN_PHOTO_EDGE) continue;
      const file = `cand-${result.candidates.length + 1}.${ext}`;
      writeFileSync(join(folder, file), image.body);
      result.candidates.push({
        file,
        source: candidate.source,
        image: url.href,
        kind: candidate.kind,
        ...(candidate.title ? { title: candidate.title } : {}),
        ...(size ?? {}),
        bytes: image.body.length,
      });
    } catch (error) {
      // One broken image does not sink the brand; the others may be fine.
      console.log(`  skip ${candidate.image}: ${reason(error)}`);
    }
  }
  return result;
}

// --- main ------------------------------------------------------------------

mkdirSync(cacheDir, { recursive: true });
const results: Record<string, BrandResult> = existsSync(candidatesFile)
  ? JSON.parse(readFileSync(candidatesFile, 'utf8'))
  : {};

console.log(`Looking for photos on ${brands.length} brand site(s)…`);
for (const brand of brands) {
  try {
    results[brand.slug] = await collect(brand);
    console.log(`${brand.slug}: ${results[brand.slug]!.candidates.length} candidate(s)`);
  } catch (error) {
    results[brand.slug] = {
      name: brand.name,
      website: brand.website,
      fetched: new Date().toISOString().slice(0, 10),
      candidates: [],
      error: reason(error),
    };
    console.log(`${brand.slug}: ${reason(error)}`);
  }
  writeFileSync(candidatesFile, `${JSON.stringify(results, null, 2)}\n`);
}

console.log(`\nCandidates: ${candidatesFile}`);
console.log('Apply one: node scripts/apply-media.ts photo <slug> .cache/photos/<slug>/<file> --source <its source> --kind brand-site');
