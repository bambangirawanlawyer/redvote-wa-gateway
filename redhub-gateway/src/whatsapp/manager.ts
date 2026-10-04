import { mkdir } from 'node:fs/promises';
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
};

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export class BaileysDeviceManager implements WhatsAppDeviceManager {
  private readonly devices = new Map<string, RuntimeDevice>();
  private readonly sessionDir: string;
  private readonly reconnectDelayMs: number;
  private shuttingDown = false;

  constructor(options: BaileysDeviceManagerOptions) {
    this.sessionDir = resolve(options.sessionDir);
    this.reconnectDelayMs = options.reconnectDelayMs ?? 5000;
  }

  status(deviceId: string): DeviceSnapshot | undefined {
    const runtime = this.devices.get(deviceId);
    return runtime ? this.snapshot(runtime) : undefined;
  }

  getQr(deviceId: string): string | undefined {
    return this.devices.get(deviceId)?.qr;
  }

  async start(input: StartDeviceInput): Promise<DeviceSnapshot> {
    this.validateId(input.deviceId, 'deviceId');
    this.validateId(input.tenantId, 'tenantId');

    const existing = this.devices.get(input.deviceId);
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

    this.devices.set(input.deviceId, runtime);
    await this.connect(runtime);
    return this.snapshot(runtime);
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
      const authDir = resolve(this.sessionDir, runtime.deviceId);
      await mkdir(authDir, { recursive: true, mode: 0o700 });

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

      socket.ev.on('creds.update', saveCreds);

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

  private validateId(value: string, field: string): void {
    if (!SAFE_ID.test(value)) {
      throw new Error(`INVALID_${field.toUpperCase()}`);
    }
  }

  private normalizeUserId(value?: string): string | undefined {
    if (!value) return undefined;
    return value.split(':')[0]?.split('@')[0];
  }
}
