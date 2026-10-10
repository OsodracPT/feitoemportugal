#!/usr/bin/env node
/**
 * Lists the brands due for a research pass (.claude/agents/brand-researcher.md),
 * most urgent first, from docs/leads/research-log.csv — one row per pass.
 *
 *   node scripts/research-due.ts            all due brands
 *   node scripts/research-due.ts --limit 20
 *
 * A brand is due when it was never researched, or its last pass is older than
 * the interval for its state: evidence goes stale (sites change, brands move
 * production or close), and a brand with gaps is worth a look sooner than one
 * that is complete. Never researched → full pass; otherwise → quick re-check.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBrands, type Brand } from '@fep/schema';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const logFile = join(repoRoot, 'docs/leads/research-log.csv');
const DAY = 86_400_000;

// Days between passes. Drafts wait on evidence, so they come round fastest.
const INTERVAL = { draft: 60, gaps: 180, complete: 365 };

function lastPasses(): Map<string, string> {
  const last = new Map<string, string>();
  if (!existsSync(logFile)) return last;
  for (const line of readFileSync(logFile, 'utf8').trim().split('\n').slice(1)) {
    const [slug, date] = line.split(',');
    if (slug && date && (last.get(slug) ?? '') < date) last.set(slug, date);
  }
  return last;
}

/** What a pass could still add, so the list says why a brand is due. */
function gaps(brand: Brand): string[] {
  return [
    brand.status === 'draft' && 'draft',
    !brand.location?.municipality && 'location',
    brand.production.scope === 'parcial' && 'parcial',
    !brand.media?.logo && 'logo',
    brand.price_range === undefined && 'price',
  ].filter((gap): gap is string => Boolean(gap));
}

const limitIndex = process.argv.indexOf('--limit');
const limit = limitIndex === -1 ? Infinity : Number(process.argv[limitIndex + 1]);
const today = Date.now();
const passes = lastPasses();

const due = loadBrands(join(repoRoot, 'data'))
  .map(({ data: brand }) => {
    const missing = gaps(brand);
    const interval =
      brand.status === 'draft' ? INTERVAL.draft : missing.some((g) => g !== 'price') ? INTERVAL.gaps : INTERVAL.complete;
    const last = passes.get(brand.slug);
    const age = last ? Math.floor((today - Date.parse(last)) / DAY) : Infinity;
    return { slug: brand.slug, last, age, overdue: age - interval, missing };
  })
  .filter((entry) => entry.overdue >= 0)
  // Never researched first, then the most overdue; gaps break ties.
  .sort((a, b) => b.overdue - a.overdue || b.missing.length - a.missing.length || a.slug.localeCompare(b.slug))
  .slice(0, limit);

for (const entry of due) {
  const mode = entry.last ? `quick (last ${entry.last})` : 'full';
  console.log(`${entry.slug}\t${mode}\t${entry.missing.join(' ') || '—'}`);
}
console.error(`${due.length} due`);
