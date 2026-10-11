/**
 * Sends the maintainer a plain-text email per submission over SMTP. When no
 * SMTP config is present (local dev) it logs instead, so the service runs with
 * no secrets. nodemailer is imported lazily so a build without it still loads
 * the pure-logic modules (tests, typecheck).
 */
import type { MailConfig } from './config.ts';

export interface Mail {
  subject: string;
  text: string;
  /** Reply-To, when the submitter left an email. */
  replyTo?: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

export async function makeMailer(config: MailConfig | null): Promise<Mailer> {
  if (!config) {
    return {
      async send(mail) {
        console.log(`[mail skipped — no SMTP configured]\nSubject: ${mail.subject}\n\n${mail.text}\n`);
      },
    };
  }
  const nodemailer = (await import('nodemailer')).default;
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
  return {
    async send(mail) {
      await transport.sendMail({
        from: config.from,
        to: config.to,
        subject: mail.subject,
        text: mail.text,
        ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
      });
    },
  };
}
