#!/usr/bin/env node
/**
 * Finds logo candidates on each brand's own website and downloads them into
 * .cache/media/ for a maintainer to review. Nothing here touches data/ or
 * assets/: approving a candidate is `scripts/apply-media.ts`.
 *
 *   node scripts/fetch-logos.ts                 published brands without a logo
 *   node scripts/fetch-logos.ts semogue vibae   only these
 *   node scripts/fetch-logos.ts --drafts        drafts too
 *   node scripts/fetch-logos.ts --limit 10
 *
 * Then open .cache/media/review.html. Runs accumulate in candidates.json, so a
 * second run only adds the brands asked for.
 *
 * Polite by design: robots.txt is honoured, one request per second overall, a
 * named User-Agent, and only the home page plus the images it points at.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brokenSvg, imageSize, loadBrands, unsafeSvg, type Brand } from '@fep/schema';
import { attr, extension, imgSource, jsonLd, politeFetcher, reason } from './lib/polite-fetch.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = join(repoRoot, '.cache/media');
const candidatesFile = join(cacheDir, 'candidates.json');

const USER_AGENT = 'FeitoEmPortugalBot/1.0 (+https://github.com/OsodracPT/feitoemportugal; logo finder)';
const MAX_HTML_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_CANDIDATES = 4;

/** Where a candidate was found, best first. */
const KINDS = ['json-ld', 'header-img', 'header-svg', 'logo-img', 'svg-icon', 'touch-icon'] as const;
type Kind = (typeof KINDS)[number];

interface Candidate {
  file: string;
  source: string;
  kind: Kind;
  width?: number;
  height?: number;
  bytes: number;
  note?: string;
}

interface BrandResult {
  name: string;
  website: string;
  fetched: string;
  candidates: Candidate[];
  error?: string;
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
      : !brand.media?.logo && (includeDrafts || brand.status === 'published'),
  )
  .slice(0, limit);

// --- fetching --------------------------------------------------------------

const { get, allowed } = politeFetcher(USER_AGENT, join(cacheDir, '.download'));

// --- finding candidates ----------------------------------------------------

const looksLikeLogo = (tag: string) => /logo|brand/i.test(tag);

function regions(html: string, element: string): string[] {
  return [...html.matchAll(new RegExp(`<${element}[\\s>][\\s\\S]*?</${element}>`, 'gi'))].map((m) => m[0]);
}

function jsonLdLogos(html: string): string[] {
  const logos: string[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if (key === 'logo') {
        if (typeof value === 'string') logos.push(value);
        else if (value && typeof value === 'object' && 'url' in value && typeof value.url === 'string') logos.push(value.url);
      } else {
        walk(value);
      }
    }
  };
  jsonLd(html).forEach(walk);
  return logos;
}

interface Found {
  kind: Kind;
  url?: string;
  /** Inline SVG markup, saved as is. */
  svg?: string;
}

function findCandidates(html: string): Found[] {
  const found: Found[] = [];
  for (const url of jsonLdLogos(html)) found.push({ kind: 'json-ld', url });

  const top = [...regions(html, 'header'), ...regions(html, 'nav')].join('\n');
  for (const [tag] of top.matchAll(/<img\b[^>]*>/gi)) {
    const url = imgSource(tag);
    if (url && looksLikeLogo(tag)) found.push({ kind: 'header-img', url });
  }
  for (const [svg] of top.matchAll(/<svg\b[\s\S]*?<\/svg>/gi)) {
    const open = /<svg\b[^>]*>/i.exec(svg)![0];
    // Icons (cart, search, menu) are small and unlabelled; a logo says so.
    if (looksLikeLogo(open) || /<title>[^<]{2,}<\/title>/i.test(svg)) found.push({ kind: 'header-svg', svg });
  }
  for (const [tag] of html.matchAll(/<img\b[^>]*>/gi)) {
    const url = imgSource(tag);
    if (url && looksLikeLogo(tag)) found.push({ kind: 'logo-img', url });
  }
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = attr(tag, 'rel') ?? '';
    const href = attr(tag, 'href');
    if (!href) continue;
    if (/\bicon\b/i.test(rel) && (/svg/i.test(attr(tag, 'type') ?? '') || /\.svg(\?|$)/i.test(href))) {
      found.push({ kind: 'svg-icon', url: href });
    }
    if (/apple-touch-icon/i.test(rel)) found.push({ kind: 'touch-icon', url: href });
  }
  return found;
}

/** Shopify and similar CDNs resize on a query parameter; ask for a sharper copy. */
function sharper(url: URL): URL {
  if (url.searchParams.has('width')) url.searchParams.set('width', '800');
  return url;
}

/**
 * Header logos are often `<svg><use href="#logo"/></svg>`, with the drawing in a
 * `<symbol>` elsewhere on the page. Saved alone, that file is empty, so pull the
 * symbol in and give the result its viewBox.
 */
function resolveUse(svg: string, html: string): string {
  const id = /<use\b[^>]*href\s*=\s*["']#([^"']+)["']/i.exec(svg)?.[1];
  if (!id) return svg;
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`\\sid\\s*=\\s*["']${escaped}["']`).test(svg)) return svg;
  const symbol = new RegExp(`<symbol\\b[^>]*\\sid\\s*=\\s*["']${escaped}["'][^>]*>([\\s\\S]*?)</symbol>`, 'i').exec(html);
  if (!symbol) return svg;
  const viewBox = attr(symbol[0].slice(0, symbol[0].indexOf('>') + 1), 'viewBox');
  return `<svg xmlns="http://www.w3.org/2000/svg"${viewBox ? ` viewBox="${viewBox}"` : ''}>${symbol[1]}</svg>`;
}

/** Why a downloaded SVG cannot be used, if it cannot: unsafe first, then broken. */
function svgNote(text: string): string | undefined {
  const unsafe = unsafeSvg(text);
  if (unsafe) return `unsafe: ${unsafe}`;
  const broken = brokenSvg(text);
  return broken ? `unsafe: broken SVG, ${broken}` : undefined;
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
  const page = await get(home.href, MAX_HTML_BYTES);
  const html = new TextDecoder().decode(page.body);
  const base = new URL(page.url);

  const seen = new Set<string>();
  for (const found of findCandidates(html)) {
    if (result.candidates.length >= MAX_CANDIDATES) break;
    const index = result.candidates.length + 1;
    try {
      if (found.svg) {
        const key = found.svg.slice(0, 500);
        if (seen.has(key)) continue;
        seen.add(key);
        const inline = resolveUse(found.svg, html);
        const svg = inline.includes('xmlns=')
          ? inline
          : inline.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
        const file = `cand-${index}.svg`;
        writeFileSync(join(folder, file), svg);
        const note = svgNote(svg);
        result.candidates.push({
          file,
          source: `${base.href} (inline SVG in header)`,
          kind: found.kind,
          bytes: svg.length,
          ...(note ? { note } : {}),
        });
        continue;
      }

      const url = sharper(new URL(found.url!, base));
      if (!['http:', 'https:'].includes(url.protocol) || seen.has(url.href)) continue;
      seen.add(url.href);
      if (!(await allowed(url))) continue;
      const image = await get(url.href, MAX_IMAGE_BYTES);
      const ext = extension(image.type, image.url);
      if (!ext) continue;
      const file = `cand-${index}.${ext}`;
      writeFileSync(join(folder, file), image.body);
      const size = ext === 'svg' ? undefined : imageSize(image.body);
      const note =
        ext === 'svg'
          ? svgNote(new TextDecoder().decode(image.body))
          : found.kind === 'touch-icon'
            ? 'app icon, often square and low resolution'
            : undefined;
      result.candidates.push({
        file,
        source: url.href,
        kind: found.kind,
        bytes: image.body.length,
        ...(size ?? {}),
        ...(note ? { note } : {}),
      });
    } catch (error) {
      // One broken image does not sink the brand; the others may be fine.
      console.log(`  skip ${found.url ?? 'inline svg'}: ${reason(error)}`);
    }
  }
  return result;
}

// --- review sheet ----------------------------------------------------------

const escape = (text: string) =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function reviewSheet(results: Record<string, BrandResult>): string {
  const rows = Object.entries(results)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, result]) => {
      const cells = result.candidates
        .map((c) => {
          const size = c.width ? `${c.width}×${c.height}` : 'vector';
          const command = `node scripts/apply-media.ts logo ${slug}=${c.file}`;
          return `<figure class="${c.note?.startsWith('unsafe') ? 'unsafe' : ''}">
  <div class="img"><img src="${escape(slug)}/${escape(c.file)}" alt=""></div>
  <figcaption><b>${c.kind}</b> · ${size} · ${Math.round(c.bytes / 1024)} KB
  ${c.note ? `<br><em>${escape(c.note)}</em>` : ''}
  <br><a href="${escape(c.source.split(' ')[0]!)}">source</a>
  <br><code>${escape(command)}</code></figcaption>
</figure>`;
        })
        .join('');
      return `<section>
  <h2>${escape(result.name)} <small>${escape(slug)} · <a href="${escape(result.website)}">${escape(result.website)}</a></small></h2>
  ${result.error ? `<p class="error">${escape(result.error)}</p>` : ''}
  ${cells || '<p class="none">No candidate found. Look by hand or ask the brand.</p>'}
</section>`;
    })
    .join('\n');
  return `<!doctype html>
<meta charset="utf-8">
<title>Logo review</title>
<style>
  body { font: 14px system-ui, sans-serif; margin: 2rem; color: #222; }
  section { border-top: 1px solid #ddd; padding: 1rem 0; display: flex; flex-wrap: wrap; gap: 1rem; }
  h2 { flex-basis: 100%; margin: 0; font-size: 1.1rem; }
  small { font-weight: normal; color: #666; }
  figure { margin: 0; width: 220px; }
  .img { height: 120px; display: grid; place-items: center; border: 1px solid #ddd;
    background: repeating-conic-gradient(#eee 0 25%, #fff 0 50%) 0 0 / 16px 16px; }
  .img img { max-width: 200px; max-height: 110px; }
  figcaption { font-size: 12px; margin-top: .4rem; word-break: break-all; }
  code { background: #f4f4f4; user-select: all; }
  .unsafe .img { outline: 3px solid #c00; }
  .error, .none { color: #a00; }
</style>
<h1>Logo candidates</h1>
<p>Pick at most one per brand: the brand's own logo, readable, not a product photo or an app icon if anything better exists.
Copy the command under it. Red outline: the SVG is unsafe and will be refused.</p>
${rows}
`;
}

// --- main ------------------------------------------------------------------

mkdirSync(cacheDir, { recursive: true });
const results: Record<string, BrandResult> = existsSync(candidatesFile)
  ? JSON.parse(readFileSync(candidatesFile, 'utf8'))
  : {};

console.log(`Looking for logos on ${brands.length} brand site(s)…`);
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

writeFileSync(join(cacheDir, 'review.html'), reviewSheet(results));
console.log(`\nReview: ${join(cacheDir, 'review.html')}`);
