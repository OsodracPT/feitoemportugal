/**
 * Runtime configuration, read from the environment. Secrets (SMTP, GitHub
 * token, the Altcha key) never live in tracked files — only in `.env` on the
 * server (see deploy/README.md). Everything here has a safe default so the
 * service also runs locally with no secrets: mail is logged, GitHub is skipped.
 */

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
}

export interface GithubConfig {
  token: string;
  /** "owner/repo" the draft-brand PR is opened against. */
  repo: string;
  /** Branch the PR targets. */
  base: string;
}

export interface Config {
  port: number;
  dbPath: string;
  /** Signs Altcha challenges and hashes stored IPs. Required in production. */
  secretKey: string;
  /** Where the static site lives; used for the thank-you redirect and API reads. */
  siteOrigin: string;
  /** Trust `X-Forwarded-For` (the service always sits behind nginx here). */
  trustProxy: boolean;
  rateLimit: { windowSeconds: number; max: number };
  retentionDays: number;
  /** Reject a POST that carries no valid Altcha solution. Off keeps noscript working. */
  altchaRequired: boolean;
  mail: MailConfig | null;
  github: GithubConfig | null;
}

const num = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const bool = (value: string | undefined, fallback: boolean): boolean =>
  value === undefined ? fallback : /^(1|true|yes|on)$/i.test(value);

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const mail: MailConfig | null =
    env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS
      ? {
          host: env.SMTP_HOST,
          port: num(env.SMTP_PORT, 465),
          secure: bool(env.SMTP_SECURE, true),
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
          from: env.MAIL_FROM ?? env.SMTP_USER,
          to: env.MAIL_TO ?? env.SMTP_USER,
        }
      : null;

  const github: GithubConfig | null =
    env.GITHUB_TOKEN && env.GITHUB_REPO
      ? { token: env.GITHUB_TOKEN, repo: env.GITHUB_REPO, base: env.GITHUB_BASE ?? 'main' }
      : null;

  return {
    port: num(env.PORT, 8787),
    dbPath: env.DB_PATH ?? './data/submissions.db',
    secretKey: env.SECRET_KEY ?? 'dev-insecure-key',
    siteOrigin: (env.SITE_ORIGIN ?? 'http://localhost:4321').replace(/\/$/, ''),
    trustProxy: bool(env.TRUST_PROXY, true),
    rateLimit: { windowSeconds: num(env.RATE_WINDOW_SECONDS, 3600), max: num(env.RATE_MAX, 5) },
    retentionDays: num(env.RETENTION_DAYS, 90),
    altchaRequired: bool(env.ALTCHA_REQUIRED, false),
    mail,
    github,
  };
}
