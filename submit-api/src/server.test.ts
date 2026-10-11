import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig, type Config } from './config.ts';
import { openStore } from './db.ts';
import { createApp } from './server.ts';
import type { Mail, Mailer } from './mailer.ts';

const sent: Mail[] = [];
const mailer: Mailer = {
  async send(mail) {
    sent.push(mail);
  },
};

let server: Server;
let base: string;
const config: Config = { ...loadConfig({}), rateLimit: { windowSeconds: 3600, max: 3 }, siteOrigin: 'https://example.test' };

beforeAll(async () => {
  const app = await createApp(config, { store: openStore(':memory:'), mailer });
  server = createServer(app.handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  base = typeof address === 'object' && address ? `http://127.0.0.1:${address.port}` : '';
});

afterAll(() => server.close());

const postJson = (path: string, body: unknown) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('submit-api server', () => {
  it('serves a challenge', async () => {
    const res = await fetch(`${base}/api/submit/challenge`);
    const body = (await res.json()) as { algorithm: string; challenge: string };
    expect(body.algorithm).toBe('SHA-256');
    expect(body.challenge).toHaveLength(64);
  });

  it('accepts a valid contact and emails the maintainer', async () => {
    const before = sent.length;
    const res = await postJson('/api/submit/contact', { message: 'Olá, adorei o site!', email: 'a@b.pt', lang: 'pt' });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(sent.length).toBe(before + 1);
    expect(sent.at(-1)?.replyTo).toBe('a@b.pt');
  });

  it('drops a honeypot hit silently (no email)', async () => {
    const before = sent.length;
    const res = await postJson('/api/submit/contact', { message: 'spam', company: 'bot corp' });
    expect((await res.json()).ok).toBe(true);
    expect(sent.length).toBe(before);
  });

  it('rejects an invalid contact', async () => {
    const res = await postJson('/api/submit/contact', { message: 'x' });
    expect(res.status).toBe(400);
    expect((await res.json()).ok).toBe(false);
  });

  it('redirects a plain form POST to the thank-you page', async () => {
    const res = await fetch(`${base}/api/submit/correction`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ brand: 'semogue', details: 'O site mudou de endereço.', lang: 'en' }),
      redirect: 'manual',
    });
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('https://example.test/en/thanks');
  });

  it('rate-limits after the window maximum', async () => {
    // A fresh IP via X-Forwarded-For so earlier tests don't count.
    const post = () =>
      fetch(`${base}/api/submit/contact`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
        body: JSON.stringify({ message: 'mensagem de teste válida' }),
      });
    for (let i = 0; i < config.rateLimit.max; i++) expect((await post()).status).toBe(200);
    expect((await post()).status).toBe(429);
  });

  it('reports brand submission as not yet available', async () => {
    const res = await postJson('/api/submit/brand', { name: 'x' });
    expect(res.status).toBe(503);
  });
});
