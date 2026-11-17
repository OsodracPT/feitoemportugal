import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { clientIpHash } from './http.ts';

const req = (forwarded: string | undefined, remote = '172.22.0.5'): IncomingMessage =>
  ({ headers: forwarded === undefined ? {} : { 'x-forwarded-for': forwarded }, socket: { remoteAddress: remote } }) as unknown as IncomingMessage;

describe('clientIpHash', () => {
  it('keys on the entry our proxy wrote, not on one the client sent', () => {
    const real = clientIpHash(req('198.51.100.7'), true, 's');
    expect(clientIpHash(req('203.0.113.1, 198.51.100.7'), true, 's')).toBe(real);
    expect(clientIpHash(req('203.0.113.2, 198.51.100.7'), true, 's')).toBe(real);
  });

  it('ignores the header when the proxy is not trusted', () => {
    expect(clientIpHash(req('198.51.100.7'), false, 's')).toBe(clientIpHash(req(undefined), false, 's'));
  });
});
