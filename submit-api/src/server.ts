/**
 * The submission service. It sits behind nginx at `/api/submit/*` on the site's
 * own origin, so the static site's forms post to it within the existing CSP
 * (`form-action 'self'`, `connect-src 'self'`). Every form works without
 * JavaScript (a plain POST redirects to the thank-you page); when JS is on, the
 * Altcha widget and a fetch add proof-of-work and inline feedback.
 *
 * Spam defence is layered so the noscript path is still protected: a honeypot
 * field, per-IP rate limiting in SQLite, and (when solved) Altcha verification.
 */
import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadConfig, type Config } from './config.ts';
import { createChallenge, verifySolution } from './altcha.ts';
import { openStore, type Store } from './db.ts';
import { makeMailer, type Mailer } from './mailer.ts';
import { clientIpHash, parseBody, readBody, sendJson, sendRedirect, wantsJson } from './http.ts';
import { validateContact, validateCorrection, validateVerification, type Validation } from './validate.ts';

interface App {
  handler: (req: IncomingMessage, res: ServerResponse) => void;
  store: Store;
  purgeExpired: () => number;
  close: () => void;
}

interface Overrides {
  store?: Store;
  mailer?: Mailer;
}

const formatMail = (type: string, data: Record<string, string>): { subject: string; text: string } => {
  const lines = Object.entries(data)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value}`);
  const label =
    type === 'correction' ? `Correção: ${data.brand}` : type === 'verification' ? `Verificação: ${data.brand}` : 'Contacto';
  return { subject: `[FEP] ${label}`, text: `Nova submissão (${type}).\n\n${lines.join('\n')}\n` };
};

const thankYou = (origin: string, lang: string): string => `${origin}${lang === 'en' ? '/en/thanks' : '/obrigado'}`;
const backWithError = (origin: string, lang: string): string =>
  `${origin}${lang === 'en' ? '/en/submit' : '/submeter'}?sent=error`;

export async function createApp(config: Config, overrides: Overrides = {}): Promise<App> {
  const store = overrides.store ?? openStore(config.dbPath);
  const mailer = overrides.mailer ?? (await makeMailer(config.mail));

  const purgeExpired = (): number => {
    const cutoff = new Date(Date.now() - config.retentionDays * 86_400_000).toISOString();
    return store.purgeOlderThan(cutoff);
  };

  async function handleForm(
    type: string,
    validate: (fields: Record<string, string>) => Validation,
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const contentType = req.headers['content-type'] ?? '';
    const json = wantsJson(contentType);
    let fields: Record<string, string>;
    try {
      fields = parseBody(contentType, await readBody(req));
    } catch {
      return finish(res, json, 400, config, 'pt', { ok: false, errors: ['Pedido inválido. / Invalid request.'] });
    }
    const lang = fields.lang === 'en' ? 'en' : 'pt';

    // Honeypot: a hidden field real people leave empty. If filled, accept silently.
    if (fields.company) return finish(res, json, 200, config, lang, { ok: true });

    if (config.altchaRequired && !verifySolution(fields.altcha, config.secretKey)) {
      return finish(res, json, 400, config, lang, {
        ok: false,
        errors: ['A verificação anti-robôs falhou. / The anti-bot check failed.'],
      });
    }

    const ipHash = clientIpHash(req, config.trustProxy, config.secretKey);
    const since = new Date(Date.now() - config.rateLimit.windowSeconds * 1000).toISOString();
    if (store.recentCount(ipHash, since) >= config.rateLimit.max) {
      return finish(res, json, 429, config, lang, {
        ok: false,
        errors: ['Demasiadas submissões. Tenta mais tarde. / Too many submissions. Try again later.'],
      });
    }

    const result = validate(fields);
    if (!result.ok) return finish(res, json, 400, config, lang, { ok: false, errors: result.errors });

    store.record({
      id: randomUUID(),
      type,
      createdAt: new Date().toISOString(),
      ipHash,
      email: result.email,
      payload: JSON.stringify(result.data),
    });
    const mail = formatMail(type, result.data);
    try {
      await mailer.send({ ...mail, ...(result.email ? { replyTo: result.email } : {}) });
    } catch (error) {
      console.error('mail send failed', error);
    }
    return finish(res, json, 200, config, lang, { ok: true });
  }

  const handler = (req: IncomingMessage, res: ServerResponse): void => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (req.method === 'GET' && path === '/api/submit/health') return sendJson(res, 200, { ok: true });
    if (req.method === 'GET' && path === '/api/submit/challenge') {
      return sendJson(res, 200, createChallenge(config.secretKey));
    }

    if (req.method === 'POST') {
      if (path === '/api/submit/contact') return void handleForm('contact', validateContact, req, res);
      if (path === '/api/submit/correction') return void handleForm('correction', validateCorrection, req, res);
      if (path === '/api/submit/verification') return void handleForm('verification', validateVerification, req, res);
      if (path === '/api/submit/brand') {
        return sendJson(res, 503, { ok: false, errors: ['A submissão de marcas ainda não está disponível. / Brand submission is not available yet.'] });
      }
    }
    sendJson(res, 404, { ok: false, errors: ['Não encontrado. / Not found.'] });
  };

  return { handler, store, purgeExpired, close: () => store.close() };
}

function finish(
  res: ServerResponse,
  json: boolean,
  status: number,
  config: Config,
  lang: string,
  body: { ok: boolean; errors?: string[] },
): void {
  if (json) return sendJson(res, status, body);
  return sendRedirect(res, body.ok ? thankYou(config.siteOrigin, lang) : backWithError(config.siteOrigin, lang));
}

export function startServer(config: Config, app: App): Server {
  const server = createHttpServer(app.handler);
  server.listen(config.port, () => console.log(`submit-api listening on :${config.port}`));
  // Sweep expired rows on boot and once a day.
  app.purgeExpired();
  const timer = setInterval(() => app.purgeExpired(), 86_400_000);
  timer.unref();
  return server;
}

// Run the server only when this file is the entry point (not when imported by a test).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const config = loadConfig();
  createApp(config).then((app) => startServer(config, app));
}
