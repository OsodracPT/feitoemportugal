/**
 * Polite fetching for the scripts that look for brand media (fetch-logos.ts,
 * fetch-photos.ts): a named User-Agent, one request per second overall,
 * robots.txt honoured and a 429 retried after a growing wait. Also the HTML
 * helpers both of them use to read image tags.
 */
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const TIMEOUT_MS = 15_000;
const PAUSE_MS = 1_000;
const RETRY_WAITS_MS = [15_000, 45_000, 90_000];

export const reason = (error: unknown): string => (error as Error).message;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface Fetcher {
  get(url: string, maxBytes: number): Promise<{ body: Uint8Array; type: string; url: string }>;
  allowed(url: URL): Promise<boolean>;
}

/**
 * Requests go through curl rather than Node's fetch. Cloudflare in front of
 * many shops (Shopify above all) answers Node's HTTP client with 429 even at one
 * request per second, while curl with the same honest User-Agent gets the page.
 * The pause is still global, since one platform hosts many brands, and a real
 * 429 is retried after a growing wait. `bodyFile` is scratch space: each body
 * lands there before it is read back.
 */
export function politeFetcher(userAgent: string, bodyFile: string): Fetcher {
  let lastRequest = 0;

  async function curl(url: string, maxBytes: number): Promise<{ status: number; type: string; url: string }> {
    // The trailer is written after the body, which goes to a file, so binary
    // images never pass through stdout.
    const { stdout } = await execFileAsync('curl', [
      '--silent', '--show-error', '--location', '--max-redirs', '5',
      '--max-time', String(TIMEOUT_MS / 1000),
      '--max-filesize', String(maxBytes),
      '--user-agent', userAgent,
      '--header', 'accept: */*',
      '--proto', '=http,https',
      '--output', bodyFile,
      '--write-out', '%{http_code}\\t%{content_type}\\t%{url_effective}',
      url,
    ]);
    const [status, type, effective] = stdout.split('\t');
    return { status: Number(status), type: type ?? '', url: effective || url };
  }

  async function get(url: string, maxBytes: number): Promise<{ body: Uint8Array; type: string; url: string }> {
    let response: { status: number; type: string; url: string };
    for (let attempt = 0; ; attempt++) {
      const wait = lastRequest + PAUSE_MS - Date.now();
      if (wait > 0) await sleep(wait);
      lastRequest = Date.now();
      try {
        response = await curl(url, maxBytes);
      } catch (error) {
        // curl exits 63 when --max-filesize trips, 6 when the host does not resolve.
        const { code, stderr } = error as { code?: number; stderr?: string };
        if (code === 63) throw new Error(`${url} is larger than ${maxBytes} bytes`);
        throw new Error(`curl failed for ${url}: ${(stderr ?? '').trim() || `exit ${code}`}`);
      }
      if (response.status !== 429 || attempt >= RETRY_WAITS_MS.length) break;
      const pause = RETRY_WAITS_MS[attempt]!;
      console.log(`  429 from ${new URL(url).host}, waiting ${Math.round(pause / 1000)}s`);
      await sleep(pause);
    }
    if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status} for ${url}`);
    const body = new Uint8Array(readFileSync(bodyFile));
    if (body.length > maxBytes) throw new Error(`${url} is larger than ${maxBytes} bytes`);
    return { body, type: response.type, url: response.url };
  }

  /** Disallow rules for `User-agent: *`, per origin. Good enough for a few pages. */
  const robotsCache = new Map<string, RegExp[]>();

  async function allowed(url: URL): Promise<boolean> {
    if (!robotsCache.has(url.origin)) {
      let rules: RegExp[] = [];
      try {
        const { body } = await get(`${url.origin}/robots.txt`, 512 * 1024);
        rules = parseRobots(new TextDecoder().decode(body));
      } catch {
        // No robots.txt, or it failed: nothing is disallowed.
      }
      robotsCache.set(url.origin, rules);
    }
    const path = url.pathname + url.search;
    return !robotsCache.get(url.origin)!.some((rule) => rule.test(path));
  }

  return { get, allowed };
}

/** `*` matches anything and a trailing `$` anchors, as Google reads robots.txt. */
const robotsRule = (value: string) =>
  new RegExp(
    `^${value
      .replace(/[.+?^{}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\\?\$$/, '$')}`,
  );

function parseRobots(text: string): RegExp[] {
  const rules: RegExp[] = [];
  let applies = false;
  let inAgents = false;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    const match = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!match) continue;
    const [, field, value] = match;
    if (field!.toLowerCase() === 'user-agent') {
      if (!inAgents) applies = false;
      inAgents = true;
      if (value === '*' || /feitoemportugal/i.test(value!)) applies = true;
    } else {
      inAgents = false;
      if (applies && field!.toLowerCase() === 'disallow' && value) rules.push(robotsRule(value));
    }
  }
  return rules;
}

// --- reading HTML ----------------------------------------------------------

export const attr = (tag: string, name: string): string | undefined => {
  const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return match ? (match[1] ?? match[2] ?? match[3])!.replace(/&amp;/g, '&') : undefined;
};

/** The largest entry of a srcset, or the src. Lazy loaders keep it in data-*. */
export function imgSource(tag: string): string | undefined {
  const srcset = attr(tag, 'srcset') ?? attr(tag, 'data-srcset');
  if (srcset) {
    const entries = srcset
      .split(',')
      .map((entry) => entry.trim().split(/\s+/))
      .map(([url, size]) => ({ url: url!, size: Number.parseFloat(size ?? '1') || 1 }))
      .sort((a, b) => b.size - a.size);
    if (entries[0]?.url) return entries[0].url;
  }
  const src = attr(tag, 'src') ?? attr(tag, 'data-src');
  return src && !src.startsWith('data:') ? src : undefined;
}

/** Every JSON-LD block on the page that parses; broken JSON-LD is common. */
export function jsonLd(html: string): unknown[] {
  const blocks: unknown[] = [];
  for (const [, body] of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      blocks.push(JSON.parse(body!));
    } catch {
      // Skip it.
    }
  }
  return blocks;
}

export function extension(type: string, url: string): string | undefined {
  if (/svg/i.test(type) || /\.svg(\?|$)/i.test(url)) return 'svg';
  if (/png/i.test(type)) return 'png';
  if (/jpe?g/i.test(type)) return 'jpg';
  if (/webp/i.test(type)) return 'webp';
  return undefined;
}
