/**
 * Progressive enhancement for the contribution forms. Every form already works
 * with JavaScript off (a plain POST to `/api/submit/*` that the service answers
 * with a 303 to the thank-you page). When JS is on this takes over: it solves
 * the Altcha proof-of-work, submits with `fetch`, and shows inline success or
 * errors so the visitor never leaves the page.
 *
 * Altcha is solved here by hand with SubtleCrypto — no library, no web
 * component, no blob worker — so the production CSP (`script-src 'self'`,
 * `connect-src 'self'`) needs no exception. The server re-derives the hash and
 * checks the HMAC signature, so a forged solution cannot pass.
 */

interface Challenge {
  algorithm: string;
  challenge: string;
  maxnumber: number;
  salt: string;
  signature: string;
}

const CHALLENGE_URL = '/api/submit/challenge';

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return toHex(digest);
}

/** Brute-forces the hidden number, then returns the base64 payload the service expects. */
async function solveAltcha(): Promise<string> {
  const response = await fetch(CHALLENGE_URL, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('challenge');
  const { algorithm, challenge, maxnumber, salt, signature } = (await response.json()) as Challenge;
  for (let number = 0; number <= maxnumber; number += 1) {
    if ((await sha256Hex(salt + number)) === challenge) {
      const solution = { algorithm, challenge, number, salt, signature };
      return btoa(JSON.stringify(solution));
    }
  }
  throw new Error('unsolved');
}

function setStatus(form: HTMLFormElement, message: string, kind: 'error' | 'success'): void {
  const status = form.querySelector<HTMLElement>('[data-submit-status]');
  if (!status) return;
  status.textContent = message;
  status.dataset.kind = kind;
  status.hidden = false;
}

function enhance(form: HTMLFormElement): void {
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const sendLabel = button?.textContent ?? '';
  const sending = form.dataset.sending ?? sendLabel;

  form.addEventListener('submit', (event) => {
    if (!form.reportValidity()) return;
    event.preventDefault();
    void send();
  });

  async function send(): Promise<void> {
    if (button) {
      button.disabled = true;
      button.textContent = sending;
    }
    try {
      const altchaField = form.querySelector<HTMLInputElement>('input[name="altcha"]');
      if (altchaField) altchaField.value = await solveAltcha();

      const payload = Object.fromEntries(new FormData(form) as unknown as Iterable<[string, string]>);
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; errors?: string[] };

      if (response.ok && body.ok) {
        form.reset();
        form.hidden = true;
        setStatus(form, form.dataset.success ?? '', 'success');
        const success = form.parentElement?.querySelector<HTMLElement>('[data-submit-success]');
        if (success) success.hidden = false;
        return;
      }
      setStatus(form, body.errors?.join(' ') ?? form.dataset.error ?? '', 'error');
    } catch {
      setStatus(form, form.dataset.error ?? '', 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = sendLabel;
      }
    }
  }
}

export function initSubmitForms(): void {
  document.querySelectorAll<HTMLFormElement>('form[data-submit-form]').forEach(enhance);
}
