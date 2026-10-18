/**
 * Altcha, self-hosted. A proof-of-work challenge the browser solves before a
 * form is accepted, with no third-party script or service: the widget is
 * served from our own origin and verified here with node:crypto, so the site's
 * CSP (`script-src 'self'`, `connect-src 'self'`) needs no exception.
 *
 * A challenge is a random salt + a hidden number; `challenge = sha256(salt +
 * number)` and `signature = hmac(secret, challenge)`. The browser brute-forces
 * the number until the hash matches, then returns the solution. We re-derive
 * the hash and check the signature, so the server never trusts the client's
 * claimed number without recomputing it.
 */
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

const ALGORITHM = 'SHA-256';

const sha256Hex = (value: string): string => createHash('sha256').update(value).digest('hex');
const hmacHex = (key: string, value: string): string => createHmac('sha256', key).update(value).digest('hex');

const equalHex = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

export interface Challenge {
  algorithm: string;
  challenge: string;
  maxnumber: number;
  salt: string;
  signature: string;
}

export interface Solution {
  algorithm?: string;
  challenge?: string;
  number?: number;
  salt?: string;
  signature?: string;
}

/** Builds a fresh challenge. The salt carries an expiry so a solution cannot be replayed forever. */
export function createChallenge(secret: string, maxnumber = 100_000, expiresInSeconds = 600): Challenge {
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const salt = `${randomBytes(12).toString('hex')}?expires=${expires}`;
  const number = randomInt(0, maxnumber + 1);
  const challenge = sha256Hex(salt + number);
  return { algorithm: ALGORITHM, challenge, maxnumber, salt, signature: hmacHex(secret, challenge) };
}

/** Verifies a base64-encoded Altcha solution (the value the widget posts). */
export function verifySolution(payload: string | undefined, secret: string): boolean {
  if (!payload) return false;
  let solution: Solution;
  try {
    solution = JSON.parse(Buffer.from(payload, 'base64').toString('utf8')) as Solution;
  } catch {
    return false;
  }
  if (solution.algorithm !== ALGORITHM) return false;
  if (typeof solution.salt !== 'string' || typeof solution.number !== 'number') return false;
  if (typeof solution.challenge !== 'string' || typeof solution.signature !== 'string') return false;

  const expires = /[?&]expires=(\d+)/.exec(solution.salt);
  if (expires && Number(expires[1]) * 1000 < Date.now()) return false;

  const challenge = sha256Hex(solution.salt + solution.number);
  if (!equalHex(challenge, solution.challenge)) return false;
  return equalHex(hmacHex(secret, challenge), solution.signature);
}
