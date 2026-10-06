import type { Dirent } from 'node:fs';
import { access, chmod, mkdir, readdir, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import makeWASocket, {
  Browsers,
  DisconnectReason,
  useMultiFileAuthState,
  type WASocket
} from 'baileys';
import type {
  DeviceConnectionStatus,
  DeviceSnapshot,
  SendDocumentInput,
  SendDocumentResult,
  SendTextInput,
  SendTextResult,
  StartDeviceInput,
  WhatsAppDeviceManager
} from './types.js';

type RuntimeDevice = {
  deviceId: string;
  tenantId: string;
  status: DeviceConnectionStatus;
  socket?: WASocket;
  qr?: string;
  phone?: string;
  lastConnectedAt?: string;
  lastErrorCode?: string;
  reconnectTimer?: NodeJS.Timeout;
};

export type BaileysDeviceManagerOptions = {
  sessionDir: string;
  reconnectDelayMs?: number;
  legacyTenantId?: string;
  legacyDeviceId?: string;
};

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export class BaileysDeviceManager implements WhatsAppDeviceManager {
  private readonly devices = new Map<string, RuntimeDevice>();
  private readonly sessionDir: string;
  private readonly reconnectDelayMs: number;
  private readonly legacyTenantId?: string;
  private readonly legacyDeviceId?: string;
  private shuttingDown = false;

  constructor(options: BaileysDeviceManagerOptions) {
    this.sessionDir = resolve(options.sessionDir);
    this.reconnectDelayMs = options.reconnectDelayMs ?? 5000;
    this.legacyTenantId = options.legacyTenantId;
    this.legacyDeviceId = options.legacyDeviceId;
  }

  list(tenantId?: string): DeviceSnapshot[] {
    return [...this.devices.values()]
      .filter((runtime) => !tenantId || runtime.tenantId === tenantId)
      .map((runtime) => this.snapshot(runtime));
  }

  status(deviceId: string, tenantId?: string): DeviceSnapshot | undefined {
    const runtime = this.findRuntime(deviceId, tenantId);
    return runtime ? this.snapshot(runtime) : undefined;
  }

  getQr(deviceId: string, tenantId?: string): string | undefined {
    return this.findRuntime(deviceId, tenantId)?.qr;
  }

  async sendText(input: SendTextInput): Promise<SendTextResult> {
    this.validateId(input.tenantId, 'tenantId');
    if (input.deviceId) this.validateId(input.deviceId, 'deviceId');

    const runtime = this.resolveConnectedDevice(input.tenantId, input.deviceId);
    const to = this.normalizeDestination(input.to);
    const text = input.text.trim();
    if (!text || text.length > 4096) throw new Error('INVALID_TEXT');

    try {
      const result = await runtime.socket!.sendMessage(`${to}@s.whatsapp.net`, { text });
      await this.hardenAuthDir(this.authDir(runtime));
      return {
        tenantId: runtime.tenantId,
        deviceId: runtime.deviceId,
        to,
        providerMessageId: result?.key.id ?? undefined
      };
    } catch {
      throw new Error('PROVIDER_ERROR');
    }
  }

  async sendDocument(input: SendDocumentInput): Promise<SendDocumentResult> {
    this.validateId(input.tenantId, 'tenantId');
    if (input.deviceId) this.validateId(input.deviceId, 'deviceId');

    const runtime = this.resolveConnectedDevice(input.tenantId, input.deviceId);
    const to = this.normalizeDestination(input.to);

    try {
      const result = await runtime.socket!.sendMessage(`${to}@s.whatsapp.net`, {
        document: input.document,
        mimetype: input.mimeType,
        fileName: input.filename,
        caption: input.caption
      });
      await this.hardenAuthDir(this.authDir(runtime));
      return {
        tenantId: runtime.tenantId,
        deviceId: runtime.deviceId,
        to,
        providerMessageId: result?.key.id ?? undefined
      };
    } catch {
      throw new Error('PROVIDER_ERROR');
    }
  }

  async start(input: StartDeviceInput): Promise<DeviceSnapshot> {
    this.validateId(input.deviceId, 'deviceId');
    this.validateId(input.tenantId, 'tenantId');

    const key = this.deviceKey(input.tenantId, input.deviceId);
    const existing = this.devices.get(key);
    if (
      existing &&
      (existing.status === 'CONNECTING' ||
        existing.status === 'PAIRING' ||
        existing.status === 'CONNECTED')
    ) {
      if (existing.tenantId !== input.tenantId) {
        throw new Error('DEVICE_TENANT_MISMATCH');
      }
      return this.snapshot(existing);
    }

    const runtime: RuntimeDevice =
      existing ??
      {
        deviceId: input.deviceId,
        tenantId: input.tenantId,
        status: 'DISCONNECTED'
      };

    if (runtime.tenantId !== input.tenantId) {
      throw new Error('DEVICE_TENANT_MISMATCH');
    }

    this.devices.set(key, runtime);
    await this.connect(runtime);
    return this.snapshot(runtime);
  }

  async restorePersistedSessions(): Promise<DeviceSnapshot[]> {
    await this.migrateLegacySessionIfNeeded();

    let tenantEntries: Dirent[];
    try {
      tenantEntries = await readdir(this.sessionDir, { withFileTypes: true });
    } catch {
      return [];
    }

    const restored: DeviceSnapshot[] = [];
    for (const tenantEntry of tenantEntries) {
      if (!tenantEntry.isDirectory() || !SAFE_ID.test(tenantEntry.name)) continue;

      const tenantDir = resolve(this.sessionDir, tenantEntry.name);
      const deviceEntries = await readdir(tenantDir, { withFileTypes: true });
      for (const deviceEntry of deviceEntries) {
        if (!deviceEntry.isDirectory() || !SAFE_ID.test(deviceEntry.name)) continue;
        const credsPath = resolve(tenantDir, deviceEntry.name, 'creds.json');
        if (!(await this.pathExists(credsPath))) continue;

        restored.push(
          await this.start({
            tenantId: tenantEntry.name,
            deviceId: deviceEntry.name
          })
        );
      }
    }

    return restored;
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true;

    for (const runtime of this.devices.values()) {
      if (runtime.reconnectTimer) {
        clearTimeout(runtime.reconnectTimer);
        runtime.reconnectTimer = undefined;
      }
      runtime.qr = undefined;
      runtime.socket = undefined;
      if (runtime.status !== 'ERROR') {
        runtime.status = 'DISCONNECTED';
      }
    }
  }

  private async connect(runtime: RuntimeDevice): Promise<void> {
    runtime.status = 'CONNECTING';
    runtime.qr = undefined;
    runtime.lastErrorCode = undefined;

    try {
      const authDir = this.authDir(runtime);
      await mkdir(authDir, { recursive: true, mode: 0o700 });
      await chmod(authDir, 0o700);
      await this.hardenAuthDir(authDir);

      const { state, saveCreds } = await useMultiFileAuthState(authDir);

      const socket = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: Browsers.ubuntu('RedHub WA Gateway'),
        printQRInTerminal: false,
        syncFullHistory: false,
        markOnlineOnConnect: false
      });

      runtime.socket = socket;

      socket.ev.on('creds.update', () => {
        void (async () => {
          await saveCreds();
          await this.hardenAuthDir(authDir);
        })().catch(() => undefined);
      });

      socket.ev.on('connection.update', (update) => {
        if (update.qr) {
          runtime.qr = update.qr;
          runtime.status = 'PAIRING';
        }

        if (update.connection === 'open') {
          runtime.qr = undefined;
          runtime.status = 'CONNECTED';
          runtime.phone = this.normalizeUserId(socket.user?.id);
          runtime.lastConnectedAt = new Date().toISOString();
          runtime.lastErrorCode = undefined;
          void this.hardenAuthDir(authDir);
        }

        if (update.connection === 'close') {
          runtime.qr = undefined;
          runtime.socket = undefined;
          runtime.status = 'DISCONNECTED';

          const code = (update.lastDisconnect?.error as Boom | undefined)?.output
            ?.statusCode;
          const loggedOut = code === DisconnectReason.loggedOut;

          if (loggedOut) {
            runtime.lastErrorCode = 'LOGGED_OUT';
            return;
          }

          if (!this.shuttingDown) {
            runtime.lastErrorCode = code ? `DISCONNECT_${code}` : 'DISCONNECTED';
            this.scheduleReconnect(runtime);
          }
        }
      });
    } catch {
      runtime.socket = undefined;
      runtime.qr = undefined;
      runtime.status = 'ERROR';
      runtime.lastErrorCode = 'CONNECT_FAILED';

      if (!this.shuttingDown) {
        this.scheduleReconnect(runtime);
      }
    }
  }

  private scheduleReconnect(runtime: RuntimeDevice): void {
    if (runtime.reconnectTimer || this.shuttingDown) return;

    runtime.reconnectTimer = setTimeout(() => {
      runtime.reconnectTimer = undefined;
      if (!this.shuttingDown) {
        void this.connect(runtime);
      }
    }, this.reconnectDelayMs);
  }

  private snapshot(runtime: RuntimeDevice): DeviceSnapshot {
    return {
      deviceId: runtime.deviceId,
      tenantId: runtime.tenantId,
      provider: 'baileys',
      status: runtime.status,
      phone: runtime.phone,
      hasQr: Boolean(runtime.qr),
      lastConnectedAt: runtime.lastConnectedAt,
      lastErrorCode: runtime.lastErrorCode
    };
  }

  private resolveConnectedDevice(tenantId: string, deviceId?: string): RuntimeDevice {
    let runtime: RuntimeDevice | undefined;

    if (deviceId) {
      runtime = this.devices.get(this.deviceKey(tenantId, deviceId));
      if (!runtime) {
        const sameDeviceOtherTenant = [...this.devices.values()].some(
          (candidate) => candidate.deviceId === deviceId && candidate.tenantId !== tenantId
        );
        if (sameDeviceOtherTenant) throw new Error('DEVICE_TENANT_MISMATCH');
        throw new Error('DEVICE_NOT_FOUND');
      }
    } else {
      const candidates = [...this.devices.values()].filter(
        (candidate) => candidate.tenantId === tenantId
      );
      if (candidates.length === 0) throw new Error('DEVICE_NOT_FOUND');
      if (candidates.length > 1) throw new Error('DEVICE_REQUIRED');
      runtime = candidates[0]!;
    }

    if (runtime.status !== 'CONNECTED' || !runtime.socket) {
      throw new Error('DEVICE_NOT_CONNECTED');
    }
    return runtime;
  }

  private findRuntime(deviceId: string, tenantId?: string): RuntimeDevice | undefined {
    if (tenantId) return this.devices.get(this.deviceKey(tenantId, deviceId));

    const matches = [...this.devices.values()].filter(
      (runtime) => runtime.deviceId === deviceId
    );
    return matches.length === 1 ? matches[0] : undefined;
  }

  private deviceKey(tenantId: string, deviceId: string): string {
    return `${tenantId}::${deviceId}`;
  }

  private authDir(runtime: Pick<RuntimeDevice, 'tenantId' | 'deviceId'>): string {
    return resolve(this.sessionDir, runtime.tenantId, runtime.deviceId);
  }

  private async hardenAuthDir(authDir: string): Promise<void> {
    try {
      await chmod(authDir, 0o700);
      const entries = await readdir(authDir, { withFileTypes: true });
      await Promise.all(
        entries.map(async (entry) => {
          const entryPath = resolve(authDir, entry.name);
          if (entry.isFile()) await chmod(entryPath, 0o600);
          if (entry.isDirectory()) await chmod(entryPath, 0o700);
        })
      );
    } catch {
      // Security hardening is best-effort here; startup/runtime verification checks permissions.
    }
  }

  private async migrateLegacySessionIfNeeded(): Promise<void> {
    if (!this.legacyTenantId || !this.legacyDeviceId) return;
    this.validateId(this.legacyTenantId, 'tenantId');
    this.validateId(this.legacyDeviceId, 'deviceId');

    const legacyDir = resolve(this.sessionDir, this.legacyDeviceId);
    const legacyCreds = resolve(legacyDir, 'creds.json');
    if (!(await this.pathExists(legacyCreds))) return;

    const tenantDir = resolve(this.sessionDir, this.legacyTenantId);
    const targetDir = resolve(tenantDir, this.legacyDeviceId);
    const targetCreds = resolve(targetDir, 'creds.json');
    if (await this.pathExists(targetCreds)) return;

    await mkdir(tenantDir, { recursive: true, mode: 0o700 });
    await rename(legacyDir, targetDir);
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  private validateId(value: string, field: string): void {
    if (!SAFE_ID.test(value)) {
      throw new Error(`INVALID_${field.toUpperCase()}`);
    }
  }

  private normalizeDestination(value: string): string {
    let normalized = value.trim().replace(/[\s()+.\-]/g, '');
    if (normalized.startsWith('0')) normalized = `62${normalized.slice(1)}`;
    if (!/^\d{8,15}$/.test(normalized)) throw new Error('INVALID_PHONE');
    return normalized;
  }

  private normalizeUserId(value?: string): string | undefined {
    if (!value) return undefined;
    return value.split(':')[0]?.split('@')[0];
  }
}
