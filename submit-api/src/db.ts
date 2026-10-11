/**
 * Storage, on the built-in node:sqlite (no native dependency to compile). One
 * table of submissions, used for an audit trail, per-IP rate limiting and the
 * 90-day retention sweep. The IP is stored only as a salted hash, and a contact
 * email only when the submitter gave one — see the no-personal-data rule.
 */
import { DatabaseSync } from 'node:sqlite';

export interface SubmissionRow {
  id: string;
  type: string;
  createdAt: string;
  ipHash: string;
  email: string | null;
  payload: string;
}

export interface Store {
  record(row: SubmissionRow): void;
  recentCount(ipHash: string, sinceIso: string): number;
  purgeOlderThan(iso: string): number;
  close(): void;
}

export function openStore(path: string): Store {
  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id         TEXT PRIMARY KEY,
      type       TEXT NOT NULL,
      created_at TEXT NOT NULL,
      ip_hash    TEXT NOT NULL,
      email      TEXT,
      payload    TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS submissions_ip_time ON submissions (ip_hash, created_at);
    CREATE INDEX IF NOT EXISTS submissions_time ON submissions (created_at);
  `);

  const insert = db.prepare(
    `INSERT INTO submissions (id, type, created_at, ip_hash, email, payload) VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const countRecent = db.prepare(
    `SELECT COUNT(*) AS c FROM submissions WHERE ip_hash = ? AND created_at >= ?`,
  );
  const purge = db.prepare(`DELETE FROM submissions WHERE created_at < ?`);

  return {
    record(row) {
      insert.run(row.id, row.type, row.createdAt, row.ipHash, row.email, row.payload);
    },
    recentCount(ipHash, sinceIso) {
      const result = countRecent.get(ipHash, sinceIso) as { c: number } | undefined;
      return result?.c ?? 0;
    },
    purgeOlderThan(iso) {
      return Number(purge.run(iso).changes);
    },
    close() {
      db.close();
    },
  };
}
