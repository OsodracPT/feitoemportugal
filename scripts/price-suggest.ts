#!/usr/bin/env node
/**
 * Suggests each brand's € level from the prices sampled on its own shop, and
 * writes the approved ones. The samples live in docs/leads/prices.csv
 * (slug,product,eur,item,url,checked), filled from brand-researcher reports.
 *
 *   node scripts/price-suggest.ts                 suggestions for every sampled brand
 *   node scripts/price-suggest.ts --apply a b c   write price_range + typical_price
 *
 * Only the latest check of the brand's main product counts: the first entry in
 * `products`, unless the samples are all of another of its products. A level is
 * a suggestion until a maintainer applies it.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBrands, loadTaxonomy, median, priceLevel, setBrandPrice } from '@fep/schema';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(repoRoot, 'data');
const pricesFile = join(repoRoot, 'docs/leads/prices.csv');
const today = new Date().toISOString().slice(0, 10);
const MIN_SAMPLES = 3;

interface Sample {
  slug: string;
  product: string;
  eur: number;
  checked: string;
}

/** Splits one CSV line, honouring quoted cells (item names can hold commas). */
function cells(line: string): string[] {
  const out: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    if (quoted && char === '"' && line[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) {
      out.push(cell);
      cell = '';
    } else cell += char;
  }
  return [...out, cell];
}

function samples(): Sample[] {
  if (!existsSync(pricesFile)) return [];
  return readFileSync(pricesFile, 'utf8')
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => {
      const [slug = '', product = '', eur = '', , , checked = ''] = cells(line);
      return { slug, product, eur: Number(eur), checked };
    })
    .filter((s) => s.slug && s.product && s.eur > 0);
}

const taxonomy = loadTaxonomy(dataDir);
const brands = new Map(loadBrands(dataDir).map((entry) => [entry.data.slug, entry]));
const bySlug = Map.groupBy(samples(), (s) => s.slug);

interface Suggestion {
  slug: string;
  product: string;
  eur: number;
  level: number;
  current?: number;
  count: number;
  checked: string;
}

function suggest(slug: string): Suggestion | string {
  const brand = brands.get(slug)?.data;
  if (!brand) return `no brand "${slug}"`;
  const rows = bySlug.get(slug) ?? [];
  const product = rows.some((r) => r.product === brand.products[0]) ? brand.products[0] : rows[0]?.product;
  if (!product) return 'no samples';
  if (!brand.products.includes(product)) return `samples are for "${product}", not one of its products`;
  const bands = taxonomy.products.find((p) => p.id === product)?.price_bands;
  if (!bands) return `"${product}" has no price_bands`;
  const latest = rows.filter((r) => r.product === product).reduce((max, r) => (r.checked > max ? r.checked : max), '');
  const used = rows.filter((r) => r.product === product && r.checked === latest);
  if (used.length < MIN_SAMPLES) return `only ${used.length} sample(s) of "${product}" on ${latest}; need ${MIN_SAMPLES}`;
  const eur = median(used.map((r) => r.eur));
  return { slug, product, eur, level: priceLevel(bands, eur), current: brand.price_range, count: used.length, checked: latest };
}

const applyIndex = process.argv.indexOf('--apply');
const slugs = applyIndex === -1 ? [...bySlug.keys()].sort() : process.argv.slice(applyIndex + 1);

for (const slug of slugs) {
  const result = suggest(slug);
  if (typeof result === 'string') {
    console.log(`skip   ${slug}: ${result}`);
    continue;
  }
  const change = result.current === undefined ? 'new' : result.current === result.level ? 'same' : `was ${result.current}`;
  console.log(
    `${'€'.repeat(result.level).padEnd(5)}  ${slug}: ${result.product} ≈ ${result.eur} € (median of ${result.count}, ${result.checked}; ${change})`,
  );
  if (applyIndex !== -1) {
    const file = join(repoRoot, brands.get(slug)!.file);
    const text = setBrandPrice(readFileSync(file, 'utf8'), {
      level: result.level,
      product: result.product,
      eur: result.eur,
      checked: result.checked,
    }).replace(/^(meta:\n(?: {2}.*\n)*? {2}updated: ).*$/m, `$1${today}`);
    writeFileSync(file, text);
  }
}
