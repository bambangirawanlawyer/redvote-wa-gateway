import { mkdir } from 'node:fs/promises';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createPool } from './db.js';
import { runMigrations } from './migrate.js';

const config = loadConfig();
const pool = createPool(config.databaseUrl);

await mkdir(config.sessionDir, { recursive: true });
await runMigrations(pool);

const app = buildApp({
  db: pool,
  logger: { level: config.logLevel },
  serviceVersion: config.serviceVersion
});

let closing = false;

async function shutdown(signal: string): Promise<void> {
  if (closing) return;
  closing = true;

  app.log.info({ signal }, 'graceful shutdown started');

  try {
    await app.close();
    await pool.end();
    app.log.info('graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, 'graceful shutdown failed');
    process.exit(1);
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ host: config.host, port: config.port });
  app.log.info(
    {
      host: config.host,
      port: config.port,
      nodeEnv: config.nodeEnv,
      sessionDir: config.sessionDir
    },
    'redhub wa gateway started'
  );
} catch (error) {
  app.log.error({ err: error }, 'startup failed');
  await pool.end();
  process.exit(1);
}
