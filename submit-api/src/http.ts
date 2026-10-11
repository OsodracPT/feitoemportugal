/**
 * Thin helpers over node:http: read a bounded request body, parse either a
 * urlencoded form (a plain POST, works with JavaScript off) or a JSON body (the
 * enhanced fetch path), find the client IP behind nginx, and decide whether the
 * caller wants JSON back or a redirect.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';

const MAX_BODY_BYTES = 64 * 1024;

export async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** Parses a request body into a flat field map. Arrays (repeated keys) join with `, `. */
export function parseBody(contentType: string, raw: string): Record<string, string> {
  const type = contentType.split(';')[0]?.trim().toLowerCase();
  if (type === 'application/json') {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const out: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed)) {
        out[key] = Array.isArray(value) ? value.join(', ') : value == null ? '' : String(value);
      }
      return out;
    } catch {
      return {};
    }
  }
  const params = new URLSearchParams(raw);
  const out: Record<string, string> = {};
  for (const key of new Set(params.keys())) out[key] = params.getAll(key).join(', ');
  return out;
}

export const wantsJson = (contentType: string): boolean =>
  contentType.split(';')[0]?.trim().toLowerCase() === 'application/json';

/** Salted hash of the client IP, so the raw address is never stored. */
export function clientIpHash(req: IncomingMessage, trustProxy: boolean, salt: string): string {
  const forwarded = trustProxy ? (req.headers['x-forwarded-for'] as string | undefined) : undefined;
  const ip = (forwarded?.split(',')[0]?.trim() || req.socket.remoteAddress) ?? 'unknown';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(text);
}

export function sendRedirect(res: ServerResponse, location: string): void {
  res.writeHead(303, { location });
  res.end();
}
