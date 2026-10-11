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
let fakeApi: Server;
let base: string;
let config: Config;

/** A stand-in for the static site's public API, serving an empty brand list. */
function startFakeApi(): Promise<string> {
  fakeApi = createServer((req, res) => {
    if (req.url === '/api/v1/brands.json') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: [] }));
      return;
    }
    res.writeHead(404).end();
  });
  return new Promise((resolve) => fakeApi.listen(0, '127.0.0.1', () => {
    const address = fakeApi.address();
    resolve(typeof address === 'object' && address ? `http://127.0.0.1:${address.port}` : '');
  }));
}

beforeAll(async () => {
  const siteOrigin = await startFakeApi();
  config = { ...loadConfig({}), rateLimit: { windowSeconds: 3600, max: 50 }, siteOrigin, github: null };
  const app = await createApp(config, { store: openStore(':memory:'), mailer });
  server = createServer(app.handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  base = typeof address === 'object' && address ? `http://127.0.0.1:${address.port}` : '';
});

afterAll(() => {
  server.close();
  fakeApi.close();
});

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
    expect(res.headers.get('location')).toBe(`${config.siteOrigin}/en/thanks`);
  });

  it('accepts a valid new-brand submission and emails the YAML (no GitHub token)', async () => {
    const before = sent.length;
    const res = await postJson('/api/submit/brand', {
      name: 'Marca Teste Única',
      website: 'https://marca-teste-unica.example.pt',
      evidence_url: 'https://marca-teste-unica.example.pt/sobre',
      evidence_quote: 'Fabricamos tudo na nossa oficina em Guimarães.',
      scope: 'total',
      category: 'calcado',
      description_pt: 'Pequena marca de calçado cosido à mão.',
      lang: 'pt',
    });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(sent.length).toBe(before + 1);
    const mail = sent.at(-1);
    expect(mail?.subject).toContain('marca-teste-unica');
    expect(mail?.text).toContain('status: draft');
    expect(mail?.text).toMatch(/No PR opened/);
  });

  it('rejects a new-brand submission with no evidence', async () => {
    const res = await postJson('/api/submit/brand', { name: 'Sem Prova', website: 'https://sem-prova.example.pt' });
    expect(res.status).toBe(400);
    expect((await res.json()).ok).toBe(false);
  });

  it('rate-limits after the window maximum', async () => {
    // Its own instance with a tiny limit, so the shared-IP functional tests above don't count.
    const limited = await createApp({ ...config, rateLimit: { windowSeconds: 3600, max: 2 } }, {
      store: openStore(':memory:'),
      mailer,
    });
    const srv = createServer(limited.handler);
    await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', resolve));
    const address = srv.address();
    const url = typeof address === 'object' && address ? `http://127.0.0.1:${address.port}/api/submit/contact` : '';
    const post = () =>
      fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'mensagem de teste válida' }) });
    expect((await post()).status).toBe(200);
    expect((await post()).status).toBe(200);
    expect((await post()).status).toBe(429);
    srv.close();
  });
});
