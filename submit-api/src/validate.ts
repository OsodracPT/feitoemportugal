/**
 * Field validation for the three simple forms (contact, correction,
 * verification). The new-brand form is validated by the shared converter in
 * @fep/schema; this file only covers the free-text flows. Messages are bilingual
 * (PT / EN) to match the rest of the site.
 */

export interface Valid {
  ok: true;
  /** A contact email the submitter chose to give, for Reply-To. Stored, never published. */
  email: string | null;
  /** The normalized answers, for the maintainer email and the audit row. */
  data: Record<string, string>;
}

export interface Invalid {
  ok: false;
  errors: string[];
}

export type Validation = Valid | Invalid;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (value: string | undefined): string => (value ?? '').replace(/\s+/g, ' ').trim();
const text = (value: string | undefined): string => (value ?? '').trim();

function checkEmail(raw: string | undefined, errors: string[]): string | null {
  const value = clean(raw);
  if (!value) return null;
  if (!EMAIL.test(value) || value.length > 254) {
    errors.push('O email não parece válido. / The email does not look valid.');
    return null;
  }
  return value;
}

export function validateContact(fields: Record<string, string>): Validation {
  const errors: string[] = [];
  const message = text(fields.message);
  if (message.length < 5) errors.push('Escreve a tua mensagem. / Please write your message.');
  if (message.length > 5000) errors.push('A mensagem é demasiado longa. / The message is too long.');
  const email = checkEmail(fields.email, errors);
  if (errors.length) return { ok: false, errors };
  return { ok: true, email, data: { name: clean(fields.name), email: email ?? '', message } };
}

export function validateCorrection(fields: Record<string, string>): Validation {
  const errors: string[] = [];
  const brand = clean(fields.brand);
  const details = text(fields.details);
  if (!brand) errors.push('Diz qual é a marca. / Say which brand.');
  if (details.length < 5) errors.push('Descreve a correção. / Describe the correction.');
  if (details.length > 5000) errors.push('O texto é demasiado longo. / The text is too long.');
  const email = checkEmail(fields.email, errors);
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    email,
    data: { brand, kind: clean(fields.kind), details, source: clean(fields.source), email: email ?? '' },
  };
}

export function validateVerification(fields: Record<string, string>): Validation {
  const errors: string[] = [];
  const brand = clean(fields.brand);
  const details = text(fields.details);
  const confirm = /^(1|true|yes|on|sim)$/i.test(clean(fields.confirm));
  if (!brand) errors.push('Diz qual é a marca. / Say which brand.');
  if (details.length < 5) errors.push('Explica como a produção pode ser confirmada. / Explain how production can be confirmed.');
  if (!confirm) errors.push('Confirma que trabalhas na marca ou és dono. / Confirm you work for or own the brand.');
  const email = checkEmail(fields.email, errors);
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    email,
    data: { brand, method: clean(fields.method), details, email: email ?? '' },
  };
}
