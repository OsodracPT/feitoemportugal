/**
 * The new-brand flow. It feeds the form fields through the shared converter
 * (@fep/schema, the same one the GitHub issue path uses), then stores the
 * submission, emails the maintainer the ready-made YAML, and — when a GitHub
 * token is configured — opens the draft-brand PR. The PR is best-effort: if it
 * fails the submission is still stored and emailed, so nothing is lost.
 */
import { randomUUID } from 'node:crypto';
import { brandToYaml, submissionFromForm } from '@fep/schema';
import type { Config } from './config.ts';
import type { Store } from './db.ts';
import type { Mailer } from './mailer.ts';
import { fetchExistingBrands, getTaxonomy } from './brand-source.ts';
import { openBrandPr } from './github.ts';

export interface BrandDeps {
  config: Config;
  store: Store;
  mailer: Mailer;
  ipHash: string;
}

export interface BrandOutcome {
  status: number;
  ok: boolean;
  errors?: string[];
}

const FIELD_IDS = [
  'name',
  'website',
  'evidence_url',
  'evidence_quote',
  'scope',
  'scope_notes',
  'category',
  'district',
  'municipality',
  'instagram',
  'description_pt',
  'description_en',
] as const;

const cell = (value: string): string => value.replace(/\s+/g, ' ').trim().replace(/\|/g, '\\|');

function toFieldMap(fields: Record<string, string>): Map<string, string> {
  const map = new Map<string, string>();
  for (const id of FIELD_IDS) {
    const value = fields[id]?.trim();
    if (value) map.set(id, value);
  }
  // The converter reads fromBrand from a relationship answer starting with "Trabalho".
  if (/^(owner|brand|sim|yes|true|1)$/i.test((fields.relationship ?? '').trim())) {
    map.set('relationship', 'Trabalho na marca ou sou dono');
  }
  return map;
}

export async function processBrand(fields: Record<string, string>, deps: BrandDeps): Promise<BrandOutcome> {
  const { config, store, mailer, ipHash } = deps;
  const today = new Date().toISOString().slice(0, 10);

  let existing;
  try {
    existing = await fetchExistingBrands(config.siteOrigin);
  } catch (error) {
    console.error('could not load existing brands', error);
    return { status: 503, ok: false, errors: ['Serviço indisponível, tenta mais tarde. / Service unavailable, try again later.'] };
  }

  const result = submissionFromForm(toFieldMap(fields), getTaxonomy(config.dataDir), existing, today);
  if (!result.ok) return { status: 400, ok: false, errors: result.errors };

  const { brand, evidence, fromBrand, notes } = result.submission;
  const yaml = brandToYaml(brand);
  const evidenceRow =
    `| \`${brand.slug}\` | web form | ${cell(evidence.url)} | "${cell(evidence.quote)}" | ` +
    `${fromBrand ? 'the brand' : 'a member of the public'} |\n`;

  store.record({
    id: randomUUID(),
    type: 'brand',
    createdAt: new Date().toISOString(),
    ipHash,
    email: null,
    payload: JSON.stringify({ slug: brand.slug, website: brand.website, evidence }),
  });

  let prLine = 'Nenhum PR aberto (sem token do GitHub). / No PR opened (no GitHub token).';
  if (config.github) {
    try {
      const pr = await openBrandPr(config.github, {
        slug: brand.slug,
        yaml,
        evidenceRow,
        title: `Nova marca: ${brand.slug}`,
        body: prBody(brand.slug, evidence, fromBrand, notes),
      });
      prLine = `PR aberto: ${pr.url}`;
    } catch (error) {
      console.error('could not open brand PR', error);
      prLine = `Falhou abrir o PR (${String(error)}); a submissão ficou guardada.`;
    }
  }

  try {
    await mailer.send({
      subject: `[FEP] Nova marca: ${brand.slug}`,
      text: [
        prLine,
        '',
        `Evidence: ${evidence.url}`,
        `Quote: "${cell(evidence.quote)}"`,
        notes.length ? `\nNotes:\n${notes.map((note) => `- ${note}`).join('\n')}` : '',
        '',
        '--- data/brands/' + brand.slug + '.yaml ---',
        yaml,
      ].join('\n'),
    });
  } catch (error) {
    console.error('mail send failed', error);
  }

  return { status: 200, ok: true };
}

function prBody(slug: string, evidence: { url: string; quote: string }, fromBrand: boolean, notes: string[]): string {
  return [
    'Draft brand suggested through the site form.',
    '',
    `- File: \`data/brands/${slug}.yaml\` (\`status: draft\`)`,
    `- Evidence: ${evidence.url}`,
    `- Quote: "${evidence.quote.replace(/\s+/g, ' ').trim()}"`,
    fromBrand ? '- Submitted by someone who works for or owns the brand.' : '',
    '',
    '### Before merging',
    '',
    '- [ ] The quote is on the page, and it says the products are made in Portugal (not only designed).',
    '- [ ] The description is original text, in both languages.',
    '- [ ] Subcategory, tags and products added.',
    '- [ ] Logo added, if the brand has a usable one (`scripts/fetch-logos.ts`, then `scripts/apply-media.ts`).',
    '- [ ] `status: published`. A draft merges fine but stays off the site.',
    ...(notes.length > 0 ? ['', '### Notes from the conversion', '', ...notes.map((note) => `- ${note}`)] : []),
  ]
    .filter((text, i, all) => text !== '' || all[i - 1] !== '')
    .join('\n');
}
