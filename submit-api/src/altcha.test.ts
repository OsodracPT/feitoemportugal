import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createChallenge, verifySolution } from './altcha.ts';

const SECRET = 'test-secret';

/** Brute-forces the number, the way the browser widget does, and encodes the solution. */
function solve(challenge: ReturnType<typeof createChallenge>): string {
  for (let number = 0; number <= challenge.maxnumber; number++) {
    if (createHash('sha256').update(challenge.salt + number).digest('hex') === challenge.challenge) {
      return Buffer.from(
        JSON.stringify({
          algorithm: challenge.algorithm,
          challenge: challenge.challenge,
          number,
          salt: challenge.salt,
          signature: challenge.signature,
        }),
      ).toString('base64');
    }
  }
  throw new Error('unsolved');
}

describe('altcha', () => {
  it('accepts a correctly solved challenge', () => {
    const challenge = createChallenge(SECRET, 5000);
    expect(verifySolution(solve(challenge), SECRET)).toBe(true);
  });

  it('rejects a wrong secret, a tampered number and junk', () => {
    const challenge = createChallenge(SECRET, 5000);
    const solution = solve(challenge);
    expect(verifySolution(solution, 'other-secret')).toBe(false);
    const tampered = JSON.parse(Buffer.from(solution, 'base64').toString('utf8'));
    tampered.number = (tampered.number as number) + 1;
    expect(verifySolution(Buffer.from(JSON.stringify(tampered)).toString('base64'), SECRET)).toBe(false);
    expect(verifySolution('not-base64-json', SECRET)).toBe(false);
    expect(verifySolution(undefined, SECRET)).toBe(false);
  });

  it('rejects an expired challenge', () => {
    const challenge = createChallenge(SECRET, 5000, -1);
    expect(verifySolution(solve(challenge), SECRET)).toBe(false);
  });
});
