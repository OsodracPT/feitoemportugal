import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { brandSchema } from './brand.ts';
import { loadBrands, loadTaxonomy } from './load.ts';
import {
  brandToYaml,
  formLabels,
  formOptionIds,
  instagramHandle,
  sharedRun,
  slugify,
  submissionFromIssue,
} from './submission.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const taxonomy = loadTaxonomy(join(root, 'data'));
const existing = loadBrands(join(root, 'data')).map(({ data }) => ({ slug: data.slug, website: data.website }));
const form = parse(readFileSync(join(root, '.github/ISSUE_TEMPLATE/nova-marca.yml'), 'utf8'));
const labels = formLabels(form);

/** Builds a body the way GitHub renders a submitted issue form. */
function issueBody(answers: Record<string, string>): string {
  return [...labels]
    .map(([label, id]) => `### ${label}\n\n${answers[id] ?? '_No response_'}`)
    .join('\n\n');
}

const valid = {
  name: 'Sapataria Teste & Filhos',
  website: 'https://sapataria-teste.example.pt',
  evidence_url: 'https://sapataria-teste.example.pt/sobre',
  evidence_quote: 'Todos os nossos sapatos são feitos à mão na nossa oficina em Felgueiras.',
  scope: 'Tudo é feito em Portugal / Everything is made in Portugal (total)',
  category: 'Calçado / Footwear (calcado)',
  district: 'Porto (porto)',
  municipality: 'felgueiras',
  description_pt: 'Sapatos clássicos de homem montados à mão numa oficina de Felgueiras.',
  description_en: 'Classic men’s shoes assembled by hand in a Felgueiras workshop.',
  instagram: 'https://www.instagram.com/sapataria.teste/',
  relationship: 'Nenhuma / None',
};

describe('the issue form', () => {
  it('offers exactly the categories and districts of the taxonomy', () => {
    expect(formOptionIds(form, 'category')).toEqual(taxonomy.categories.map((c) => c.id));
    expect(formOptionIds(form, 'district')).toEqual(['none', ...taxonomy.regions.map((r) => r.id)]);
    expect(formOptionIds(form, 'scope')).toEqual(['total', 'parcial']);
  });
});

describe('submissionFromIssue', () => {
  it('turns a complete issue into a draft brand', () => {
    const result = submissionFromIssue(issueBody(valid), labels, taxonomy, existing, '2026-10-08');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { brand, evidence, notes } = result.submission;
    expect(brand.slug).toBe('sapataria-teste-e-filhos');
    expect(brand.status).toBe('draft');
    expect(brand.verification).toEqual({ verified: false });
    expect(brand.location).toEqual({ district: 'porto', municipality: 'felgueiras' });
    expect(brand.social).toEqual({ instagram: 'sapataria.teste' });
    expect(brand.meta).toEqual({ added: '2026-10-08', updated: '2026-10-08', source: 'github' });
    expect(evidence.quote).toContain('Felgueiras');
    expect(notes).toEqual([]);
    // The quote never reaches the brand file.
    expect(JSON.stringify(brand)).not.toContain('nossa oficina');
  });

  it('writes a file that reads back as the same brand', () => {
    const result = submissionFromIssue(issueBody(valid), labels, taxonomy, existing, '2026-10-08');
    if (!result.ok) throw new Error(result.errors.join('; '));
    const text = brandToYaml(result.submission.brand);
    expect(text).toContain('  pt: >-\n');
    expect(brandSchema.parse(parse(text))).toEqual(brandSchema.parse(result.submission.brand));
  });

  it('refuses a brand that is already listed, by slug or by website', () => {
    const [first] = existing;
    const bySlug = submissionFromIssue(issueBody({ ...valid, name: first!.slug }), labels, taxonomy, existing, '2026-10-08');
    expect(bySlug.ok).toBe(false);
    const bySite = submissionFromIssue(
      issueBody({ ...valid, website: `${first!.website.replace(/\/$/, '')}/loja` }),
      labels,
      taxonomy,
      existing,
      '2026-10-08',
    );
    expect(bySite.ok).toBe(false);
  });

  it('asks what is made in Portugal when production is partial', () => {
    const result = submissionFromIssue(
      issueBody({ ...valid, scope: 'Uma parte é feita fora / Part of it is made elsewhere (parcial)' }),
      labels,
      taxonomy,
      existing,
      '2026-10-08',
    );
    expect(result.ok).toBe(false);
  });

  it('flags a description copied from the brand and an unknown municipality', () => {
    const result = submissionFromIssue(
      issueBody({ ...valid, description_pt: valid.evidence_quote, municipality: 'Atlântida' }),
      labels,
      taxonomy,
      existing,
      '2026-10-08',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.submission.brand.location).toEqual({ district: 'porto' });
    expect(result.submission.notes.join(' ')).toMatch(/repeats the brand's own words/);
    expect(result.submission.notes.join(' ')).toMatch(/Atlântida/);
  });

  it('never lets the body choose a path', () => {
    const result = submissionFromIssue(
      issueBody({ ...valid, name: '../../.github/workflows/x' }),
      labels,
      taxonomy,
      existing,
      '2026-10-08',
    );
    expect(result.ok && result.submission.brand.slug).toBe('github-workflows-x');
  });
});

describe('helpers', () => {
  it('slugifies, reads handles and finds shared runs', () => {
    expect(slugify('Ação & Côr, Lda.')).toBe('acao-e-cor-lda');
    expect(instagramHandle('@marca_pt')).toBe('marca_pt');
    expect(instagramHandle('not a handle')).toBeUndefined();
    expect(sharedRun('um dois três quatro cinco seis sete', 'zero um dois três quatro cinco seis')).toBe(
      'um dois tres quatro cinco seis',
    );
    expect(sharedRun('um dois três', 'quatro cinco seis')).toBeNull();
  });
});
