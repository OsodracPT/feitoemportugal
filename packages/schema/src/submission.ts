/**
 * Turns a "Sugerir uma marca" issue (.github/ISSUE_TEMPLATE/nova-marca.yml)
 * into a draft brand. Shared by scripts/issue-to-pr.ts and, later, the web
 * form, so both produce the same file.
 *
 * The issue body is untrusted text. Nothing from it is ever run or used as a
 * path: the slug is rebuilt from the name, every field goes through the brand
 * schema, and the result is a plain object for a YAML serialiser.
 */
import { Document, isScalar, parse } from 'yaml';
import { brandSchema, type BrandInput } from './brand.ts';
import { checkBrandReferences } from './dataset.ts';
import type { Taxonomy } from './taxonomy.ts';

/** GitHub renders an empty optional field as this. */
const NO_RESPONSE = '_No response_';

export interface Submission {
  /** Validated, and without the schema's defaults, so the file stays short. */
  brand: BrandInput;
  evidence: { url: string; quote: string };
  /** The submitter said they work for or own the brand. */
  fromBrand: boolean;
  /** Things a maintainer should look at before merging. */
  notes: string[];
}

export type SubmissionResult = { ok: true; submission: Submission } | { ok: false; errors: string[] };

/**
 * Splits an issue-form body into answers keyed by field id. GitHub writes each
 * field as `### <label>` followed by the answer; `labels` maps label to id.
 */
export function parseIssueForm(body: string, labels: Map<string, string>): Map<string, string> {
  const answers = new Map<string, string>();
  const sections = body.replace(/\r\n/g, '\n').split(/^### /m).slice(1);
  for (const section of sections) {
    const newline = section.indexOf('\n');
    const label = (newline === -1 ? section : section.slice(0, newline)).trim();
    const id = labels.get(label);
    if (!id) continue;
    const value = newline === -1 ? '' : section.slice(newline + 1).trim();
    if (value && value !== NO_RESPONSE) answers.set(id, value);
  }
  return answers;
}

/** "Calçado / Footwear (calcado)" → "calcado". */
const optionId = (value: string | undefined): string | undefined =>
  value?.match(/\(([a-z0-9-]+)\)\s*$/)?.[1];

export const foldText = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const slugify = (name: string): string =>
  foldText(name)
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');

/** Host without `www.`, for spotting a brand that is already listed. */
export function siteHost(url: string): string | undefined {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

/** "@marca", "instagram.com/marca/" or "marca" → "marca". */
export function instagramHandle(value: string): string | undefined {
  const handle = value
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .split(/[/?#]/)[0];
  return /^[A-Za-z0-9._]{1,30}$/.test(handle ?? '') ? handle : undefined;
}

/**
 * The first run of `length` words that two texts share, or null. A description
 * that repeats the brand's own sentence is copied text, which the CC BY
 * licence of the dataset cannot cover.
 */
export function sharedRun(a: string, b: string, length = 6): string | null {
  const words = (text: string) => foldText(text).split(/[^a-z0-9]+/).filter(Boolean);
  const runs = new Set<string>();
  const first = words(a);
  for (let i = 0; i + length <= first.length; i++) runs.add(first.slice(i, i + length).join(' '));
  const second = words(b);
  for (let i = 0; i + length <= second.length; i++) {
    const run = second.slice(i, i + length).join(' ');
    if (runs.has(run)) return run;
  }
  return null;
}

/** Collapses the paragraphs of a textarea answer into one line of prose. */
const prose = (value: string | undefined): string | undefined =>
  value?.replace(/\s+/g, ' ').trim() || undefined;

export interface ExistingBrand {
  slug: string;
  website: string;
}

export function submissionFromIssue(
  body: string,
  labels: Map<string, string>,
  taxonomy: Taxonomy,
  existing: ExistingBrand[],
  today: string,
): SubmissionResult {
  const answers = parseIssueForm(body, labels);
  const errors: string[] = [];
  const notes: string[] = [];

  const name = prose(answers.get('name'));
  const website = answers.get('website')?.trim();
  const evidenceUrl = answers.get('evidence_url')?.trim();
  const quote = prose(answers.get('evidence_quote'));
  if (!name) errors.push('Falta o nome da marca. / The brand name is missing.');
  if (!evidenceUrl || !quote) {
    errors.push(
      'Falta a página ou a frase em que a marca diz que fabrica em Portugal. / The page or sentence where the brand says it makes its products in Portugal is missing.',
    );
  }

  const slug = name ? slugify(name) : '';
  if (name && !slug) errors.push('O nome não dá um identificador válido. / The name does not give a valid id.');

  const taken = existing.find((brand) => brand.slug === slug);
  if (taken) errors.push(`Já existe uma marca com o identificador \`${slug}\`. / A brand with the id \`${slug}\` already exists.`);
  const host = website ? siteHost(website) : undefined;
  const sameSite = host ? existing.find((brand) => siteHost(brand.website) === host) : undefined;
  if (sameSite && sameSite !== taken) {
    errors.push(`O site já está na lista, como \`${sameSite.slug}\`. / The website is already listed, as \`${sameSite.slug}\`.`);
  }

  const scope = optionId(answers.get('scope'));
  const scopeNotes = prose(answers.get('scope_notes'));
  if (scope === 'parcial' && !scopeNotes) {
    errors.push(
      'Produção parcial: diz o que é feito em Portugal. / Partial production: say what is made in Portugal.',
    );
  }

  const district = optionId(answers.get('district'));
  const region = district && district !== 'none' ? taxonomy.regions.find((r) => r.id === district) : undefined;
  const municipalityName = prose(answers.get('municipality'));
  let municipality: string | undefined;
  if (municipalityName) {
    const match = region?.municipalities.find((m) => foldText(m.name) === foldText(municipalityName));
    if (match) municipality = match.id;
    else notes.push(`The municipality "${municipalityName}" did not match a municipality of the chosen district, so it was left out.`);
  }

  const instagramAnswer = answers.get('instagram');
  const instagram = instagramAnswer ? instagramHandle(instagramAnswer) : undefined;
  if (instagramAnswer && !instagram) notes.push(`The Instagram answer "${instagramAnswer}" is not a handle, so it was left out.`);

  const descriptionPt = prose(answers.get('description_pt'));
  const descriptionEn = prose(answers.get('description_en'));
  if (!descriptionEn) notes.push('No English description yet.');
  for (const text of [descriptionPt, descriptionEn]) {
    const run = text && quote ? sharedRun(text, quote) : null;
    if (run) notes.push(`The description repeats the brand's own words ("${run}"). Rewrite it before merging.`);
  }

  const fromBrand = answers.get('relationship')?.startsWith('Trabalho') ?? false;
  if (errors.length > 0) return { ok: false, errors };

  const input: BrandInput = {
    slug,
    status: 'draft',
    name: name!,
    description: { pt: descriptionPt ?? '', ...(descriptionEn ? { en: descriptionEn } : {}) },
    website: website ?? '',
    category: optionId(answers.get('category')) ?? '',
    production: {
      scope: scope === 'parcial' ? 'parcial' : 'total',
      ...(scope === 'parcial' ? { notes: { pt: scopeNotes } } : {}),
    },
    ...(region ? { location: { district: region.id, ...(municipality ? { municipality } : {}) } } : {}),
    ...(instagram ? { social: { instagram } } : {}),
    verification: { verified: false },
    meta: { added: today, updated: today, source: 'github' },
  };

  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => `\`${issue.path.join('.')}\`: ${issue.message}`),
    };
  }
  const referenceErrors = checkBrandReferences(parsed.data, taxonomy, `data/brands/${slug}.yaml`)
    .filter((issue) => issue.level === 'error')
    .map((issue) => `\`${issue.path}\`: ${issue.message}`);
  if (referenceErrors.length > 0) return { ok: false, errors: referenceErrors };

  return {
    ok: true,
    submission: { brand: input, evidence: { url: evidenceUrl!, quote: quote! }, fromBrand, notes },
  };
}

interface FormField {
  type: string;
  id?: string;
  attributes?: { label?: string; options?: unknown[] };
}

const formFields = (form: unknown): FormField[] =>
  ((form as { body?: FormField[] } | null)?.body ?? []).filter((field) => field.id);

/** Reads an issue-form file (the YAML GitHub renders as a form). */
export const parseIssueFormFile = (text: string): unknown => parse(text);

/** Label → field id, from a parsed issue-form YAML. */
export function formLabels(form: unknown): Map<string, string> {
  return new Map(
    formFields(form).flatMap((field) =>
      field.attributes?.label ? [[field.attributes.label, field.id!] as [string, string]] : [],
    ),
  );
}

/** The ids in parentheses at the end of a dropdown's options. */
export function formOptionIds(form: unknown, fieldId: string): string[] {
  const field = formFields(form).find((f) => f.id === fieldId);
  return (field?.attributes?.options ?? []).flatMap((option) => {
    const id = typeof option === 'string' ? optionId(option) : undefined;
    return id ? [id] : [];
  });
}

/** A brand file in the layout the hand-written ones use: prose as `>-` blocks. */
export function brandToYaml(brand: BrandInput): string {
  const doc = new Document(brand);
  for (const path of [
    ['description', 'pt'],
    ['description', 'en'],
    ['production', 'notes', 'pt'],
  ]) {
    const node = doc.getIn(path, true);
    if (isScalar(node)) node.type = 'BLOCK_FOLDED';
  }
  return doc.toString({ lineWidth: 88, minContentWidth: 40 });
}
