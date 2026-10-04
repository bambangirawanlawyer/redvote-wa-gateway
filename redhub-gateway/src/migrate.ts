import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type pg from 'pg';

export async function runMigrations(
  pool: pg.Pool,
  migrationsDir = resolve(process.cwd(), 'migrations')
): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const files = (await readdir(migrationsDir))
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort();

  const appliedResult = await pool.query<{ name: string }>(
    'SELECT name FROM schema_migrations ORDER BY name'
  );
  const applied = new Set(appliedResult.rows.map((row) => row.name));

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = await readFile(resolve(migrationsDir, file), 'utf8');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations(name) VALUES ($1)',
        [file]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
