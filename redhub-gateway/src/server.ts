import { mkdir } from 'node:fs/promises';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createPool } from './db.js';
import { runMigrations } from './migrate.js';
import { BaileysDeviceManager } from './whatsapp/manager.js';

const sensitiveLibsignalLogPrefixes = new Set([
  'Closing session:',
  'Opening session:',
  'Removing old closed session:',
  'Session already closed'
]);

function suppressSensitiveLibsignalSessionLogs(): void {
  const originalInfo = console.info.bind(console);
  const originalWarn = console.warn.bind(console);
  const isSensitive = (args: unknown[]): boolean =>
    typeof args[0] === 'string' && sensitiveLibsignalLogPrefixes.has(args[0]);

  console.info = (...args: unknown[]) => {
    if (!isSensitive(args)) originalInfo(...args);
  };
  console.warn = (...args: unknown[]) => {
    if (!isSensitive(args)) originalWarn(...args);
  };
}

suppressSensitiveLibsignalSessionLogs();

const config = loadConfig();
const pool = createPool(config.databaseUrl);

await mkdir(config.sessionDir, { recursive: true, mode: 0o700 });
await runMigrations(pool);

const devices = new BaileysDeviceManager({
  sessionDir: config.sessionDir,
  reconnectDelayMs: config.whatsappReconnectDelayMs,
  legacyTenantId: config.defaultTenantId,
  legacyDeviceId: config.defaultDeviceId
});

await devices.restorePersistedSessions();

const app = buildApp({
  db: pool,
  devices,
  apiTokenSecret: config.apiTokenSecret,
  logger: { level: config.logLevel },
  serviceVersion: config.serviceVersion
});

let closing = false;

async function shutdown(signal: string): Promise<void> {
  if (closing) return;
  closing = true;

  app.log.info({ signal }, 'graceful shutdown started');

  try {
    await devices.shutdown();
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

  if (config.autoStartWhatsApp) {
    void devices
      .start({
        tenantId: config.defaultTenantId,
        deviceId: config.defaultDeviceId
      })
      .catch(() => {
        app.log.error(
          {
            deviceId: config.defaultDeviceId,
            tenantId: config.defaultTenantId
          },
          'WhatsApp auto-start failed'
        );
      });
  }

  app.log.info(
    {
      host: config.host,
      port: config.port,
      nodeEnv: config.nodeEnv,
      sessionDir: config.sessionDir,
      autoStartWhatsApp: config.autoStartWhatsApp
    },
    'redhub wa gateway started'
  );
} catch (error) {
  app.log.error({ err: error }, 'startup failed');
  await devices.shutdown();
  await pool.end();
  process.exit(1);
}
