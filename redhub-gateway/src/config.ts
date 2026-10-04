import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function port(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`Invalid port in ${name}`);
  }
  return value;
}

export type AppConfig = {
  nodeEnv: string;
  host: string;
  port: number;
  databaseUrl: string;
  apiTokenSecret: string;
  sessionDir: string;
  logLevel: string;
  serviceVersion: string;
  defaultTenantId: string;
  defaultDeviceId: string;
  autoStartWhatsApp: boolean;
  whatsappReconnectDelayMs: number;
};

export function loadConfig(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    host: process.env.HOST ?? '0.0.0.0',
    port: port('PORT', 3410),
    databaseUrl: required('DATABASE_URL'),
    apiTokenSecret: required('API_TOKEN_SECRET'),
    sessionDir: process.env.SESSION_DIR ?? './data/whatsapp-sessions',
    logLevel: process.env.LOG_LEVEL ?? 'info',
    serviceVersion: process.env.SERVICE_VERSION ?? '0.1.0',
    defaultTenantId: process.env.DEFAULT_TENANT_ID ?? 'jember',
    defaultDeviceId: process.env.DEFAULT_DEVICE_ID ?? 'jember-main',
    autoStartWhatsApp: (process.env.AUTO_START_WHATSAPP ?? 'false').toLowerCase() === 'true',
    whatsappReconnectDelayMs: Number(process.env.WHATSAPP_RECONNECT_DELAY_MS ?? '5000')
  };
}
