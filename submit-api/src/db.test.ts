import { describe, expect, it } from 'vitest';
import { openStore, type SubmissionRow } from './db.ts';

const row = (over: Partial<SubmissionRow> = {}): SubmissionRow => ({
  id: crypto.randomUUID(),
  type: 'contact',
  createdAt: new Date().toISOString(),
  ipHash: 'ip-a',
  email: null,
  payload: '{}',
  ...over,
});

describe('store', () => {
  it('records rows and counts recent ones per IP', () => {
    const store = openStore(':memory:');
    const now = new Date();
    store.record(row({ ipHash: 'ip-a', createdAt: now.toISOString() }));
    store.record(row({ ipHash: 'ip-a', createdAt: now.toISOString() }));
    store.record(row({ ipHash: 'ip-b', createdAt: now.toISOString() }));
    const since = new Date(now.getTime() - 3600_000).toISOString();
    expect(store.recentCount('ip-a', since)).toBe(2);
    expect(store.recentCount('ip-b', since)).toBe(1);
    expect(store.recentCount('ip-c', since)).toBe(0);
    store.close();
  });

  it('purges rows older than the cutoff', () => {
    const store = openStore(':memory:');
    store.record(row({ createdAt: '2020-01-01T00:00:00.000Z' }));
    store.record(row({ createdAt: new Date().toISOString() }));
    const removed = store.purgeOlderThan('2021-01-01T00:00:00.000Z');
    expect(removed).toBe(1);
    expect(store.recentCount('ip-a', '2019-01-01T00:00:00.000Z')).toBe(1);
    store.close();
  });
});
