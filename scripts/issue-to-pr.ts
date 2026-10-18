#!/usr/bin/env node
/**
 * Turns an approved "Sugerir uma marca" issue into a draft brand file plus a
 * row in the community evidence notes. Run by .github/workflows/issue-to-pr.yml.
 *
 * Reads the issue from the environment (ISSUE_BODY, ISSUE_NUMBER, ISSUE_URL),
 * never from the command line, so the body is never parsed by a shell.
 * Writes `ok`, `slug` and the path of a Markdown message to GITHUB_OUTPUT: the
 * pull request body on success, the comment for the issue on failure.
 *
 * Try it locally:
 *   ISSUE_BODY="$(cat body.md)" ISSUE_NUMBER=1 ISSUE_URL=https://example.org node scripts/issue-to-pr.ts
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  brandToYaml,
  formLabels,
  loadBrands,
  loadTaxonomy,
  parseIssueFormFile,
  submissionFromIssue,
} from '@fep/schema';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(repoRoot, 'data');
const evidenceFile = join(repoRoot, 'docs/leads/evidence-community.md');

const body = process.env.ISSUE_BODY ?? '';
const number = Number(process.env.ISSUE_NUMBER);
const issueUrl = process.env.ISSUE_URL ?? '';
if (!Number.isInteger(number) || number <= 0) throw new Error('ISSUE_NUMBER must be a positive integer');

const form = parseIssueFormFile(readFileSync(join(repoRoot, '.github/ISSUE_TEMPLATE/nova-marca.yml'), 'utf8'));
const existing = loadBrands(dataDir).map(({ data }) => ({ slug: data.slug, website: data.website }));
const today = new Date().toISOString().slice(0, 10);
const result = submissionFromIssue(body, formLabels(form), loadTaxonomy(dataDir), existing, today);

const messageFile = join(process.env.RUNNER_TEMP ?? tmpdir(), `issue-${number}.md`);
const output = (values: Record<string, string>) => {
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
  else console.log(lines.join('\n'));
};

/** Quotes and URLs come from the issue; keep them from breaking the table. */
const line = (value: string) => value.replace(/\s+/g, ' ').trim();
const cell = (value: string) => line(value).replace(/\|/g, '\\|');

if (!result.ok) {
  writeFileSync(
    messageFile,
    [
      'Não foi possível criar a ficha a partir desta sugestão. / This suggestion could not be turned into a brand file.',
      '',
      ...result.errors.map((error) => `- ${error}`),
      '',
      'Edita a issue e volta a pôr a etiqueta `aprovado`. / Edit the issue and add the `aprovado` label again.',
      '',
    ].join('\n'),
  );
  output({ ok: 'false', message: messageFile });
} else {
  const { brand, evidence, fromBrand, notes } = result.submission;
  writeFileSync(join(dataDir, 'brands', `${brand.slug}.yaml`), brandToYaml(brand));

  if (!existsSync(evidenceFile)) {
    writeFileSync(
      evidenceFile,
      [
        '# Community submissions: evidence',
        '',
        'One row per brand suggested through the "Sugerir uma marca" issue form. The quote is',
        'the sentence the submitter copied from the brand\'s own site; a maintainer checks it',
        'against the page before merging. Quotes live here, never in the brand file.',
        '',
        '| Slug | Issue | Page | Quote from the brand\'s own site | Submitted by |',
        '|---|---|---|---|---|',
        '',
      ].join('\n'),
    );
  }
  appendFileSync(
    evidenceFile,
    `| \`${brand.slug}\` | [#${number}](${cell(issueUrl)}) | ${cell(evidence.url)} | "${cell(evidence.quote)}" | ${
      fromBrand ? 'the brand' : 'a member of the public'
    } |\n`,
  );

  writeFileSync(
    messageFile,
    [
      `Draft brand from #${number}, created when the issue was approved.`,
      '',
      `- File: \`data/brands/${brand.slug}.yaml\` (\`status: draft\`)`,
      `- Evidence: ${evidence.url}`,
      `- Quote: "${line(evidence.quote)}"`,
      fromBrand ? '- Submitted by someone who works for or owns the brand.' : '',
      '',
      '### Before merging',
      '',
      '- [ ] The quote is on the page, and it says the products are made in Portugal (not only designed).',
      '- [ ] The description is original text, in both languages.',
      '- [ ] Subcategory, tags and products added.',
      '- [ ] Logo added, if the brand has a usable one (`scripts/fetch-logos.ts`, then `scripts/apply-media.ts`).',
      '- [ ] `status: published`. A draft merges fine but stays off the site; leave it only to hold the brand back on purpose.',
      ...(notes.length > 0 ? ['', '### Notes from the conversion', '', ...notes.map((note) => `- ${note}`)] : []),
      '',
      `Closes #${number}`,
    ]
      .filter((text, i, all) => text !== '' || all[i - 1] !== '')
      .join('\n') + '\n',
  );
  output({ ok: 'true', slug: brand.slug, message: messageFile });
}
