import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function secret(name: string): string {
  const value = required(name).trim();
  if (value.length < 32 || value.toUpperCase().includes('CHANGE_ME')) {
    throw new Error(`${name} must be at least 32 characters and not a placeholder`);
  }
  return value;
}

function csv(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
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
  documentAllowedHosts: string[];
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
    apiTokenSecret: secret('API_TOKEN_SECRET'),
    documentAllowedHosts: csv('DOCUMENT_ALLOWED_HOSTS'),
    sessionDir: process.env.SESSION_DIR ?? './data/whatsapp-sessions',
    logLevel: process.env.LOG_LEVEL ?? 'info',
    serviceVersion: process.env.SERVICE_VERSION ?? '0.1.0',
    defaultTenantId: required('DEFAULT_TENANT_ID'),
    defaultDeviceId: required('DEFAULT_DEVICE_ID'),
    autoStartWhatsApp: (process.env.AUTO_START_WHATSAPP ?? 'false').toLowerCase() === 'true',
    whatsappReconnectDelayMs: Number(process.env.WHATSAPP_RECONNECT_DELAY_MS ?? '5000')
  };
}
