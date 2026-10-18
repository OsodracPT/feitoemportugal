/**
 * Minimal GitHub REST client over fetch (no Octokit dependency). It opens a
 * draft-brand PR the way scripts/issue-to-pr.ts does, but from the running
 * service: create a branch, write data/brands/<slug>.yaml and append the
 * evidence row, then open the PR and label it. Every call is best-effort at the
 * caller — a failure falls back to email so a submission is never lost.
 */
import type { GithubConfig } from './config.ts';

const API = 'https://api.github.com';

async function gh(config: GithubConfig, path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API}/repos/${config.repo}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${config.token}`,
      accept: 'application/vnd.github+json',
      'user-agent': 'fep-submit-api',
      'x-github-api-version': '2022-11-28',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  return res;
}

const toBase64 = (text: string): string => Buffer.from(text, 'utf8').toString('base64');

async function refSha(config: GithubConfig, branch: string): Promise<string> {
  const res = await gh(config, `/git/ref/heads/${encodeURIComponent(branch)}`);
  if (!res.ok) throw new Error(`cannot read branch ${branch}: ${res.status}`);
  const body = (await res.json()) as { object: { sha: string } };
  return body.object.sha;
}

async function createBranch(config: GithubConfig, branch: string, sha: string): Promise<void> {
  const res = await gh(config, '/git/refs', {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
  });
  if (!res.ok) throw new Error(`cannot create branch ${branch}: ${res.status}`);
}

interface FileAt {
  sha: string;
  text: string;
}

async function getFile(config: GithubConfig, path: string, ref: string): Promise<FileAt | null> {
  const res = await gh(config, `/contents/${path}?ref=${encodeURIComponent(ref)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`cannot read ${path}: ${res.status}`);
  const body = (await res.json()) as { sha: string; content: string };
  return { sha: body.sha, text: Buffer.from(body.content, 'base64').toString('utf8') };
}

async function putFile(
  config: GithubConfig,
  path: string,
  text: string,
  message: string,
  branch: string,
  sha?: string,
): Promise<void> {
  const res = await gh(config, `/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: toBase64(text), branch, ...(sha ? { sha } : {}) }),
  });
  if (!res.ok) throw new Error(`cannot write ${path}: ${res.status}`);
}

export interface BrandPrInput {
  slug: string;
  yaml: string;
  /** The row to append to docs/leads/evidence-community.md. */
  evidenceRow: string;
  title: string;
  body: string;
}

export interface BrandPrResult {
  number: number;
  url: string;
}

const EVIDENCE_PATH = 'docs/leads/evidence-community.md';
const EVIDENCE_HEADER = [
  '# Community submissions: evidence',
  '',
  'One row per brand suggested through the site form or the "Sugerir uma marca" issue',
  "form. The quote is the sentence the submitter copied from the brand's own site; a",
  'maintainer checks it against the page before merging. Quotes live here, never in the',
  'brand file.',
  '',
  "| Slug | Issue | Page | Quote from the brand's own site | Submitted by |",
  '|---|---|---|---|---|',
  '',
].join('\n');

/** Opens the draft-brand PR. Throws if the slug already has a file or any step fails. */
export async function openBrandPr(config: GithubConfig, input: BrandPrInput): Promise<BrandPrResult> {
  const short = globalThis.crypto.randomUUID().slice(0, 8);
  const branch = `sugestao/web-${short}`;
  const baseSha = await refSha(config, config.base);
  await createBranch(config, branch, baseSha);

  const yamlPath = `data/brands/${input.slug}.yaml`;
  if (await getFile(config, yamlPath, branch)) {
    throw new Error(`a file for ${input.slug} already exists`);
  }
  await putFile(config, yamlPath, input.yaml, `feat(data): suggest ${input.slug} (web form)`, branch);

  const evidence = await getFile(config, EVIDENCE_PATH, branch);
  const nextEvidence = (evidence ? evidence.text.replace(/\n*$/, '\n') : EVIDENCE_HEADER) + input.evidenceRow;
  await putFile(config, EVIDENCE_PATH, nextEvidence, `docs(leads): evidence for ${input.slug}`, branch, evidence?.sha);

  const pull = await gh(config, '/pulls', {
    method: 'POST',
    body: JSON.stringify({ title: input.title, head: branch, base: config.base, body: input.body }),
  });
  if (!pull.ok) throw new Error(`cannot open PR: ${pull.status}`);
  const pr = (await pull.json()) as { number: number; html_url: string };

  // A missing label must not fail the PR.
  await gh(config, `/issues/${pr.number}/labels`, {
    method: 'POST',
    body: JSON.stringify({ labels: ['nova-marca'] }),
  }).catch(() => undefined);

  return { number: pr.number, url: pr.html_url };
}
