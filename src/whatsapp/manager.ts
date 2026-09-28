import path from 'node:path';
import fs from 'node:fs/promises';
import makeWASocket, {
  Browsers,
  DisconnectReason,
  useMultiFileAuthState,
  type WASocket,
} from 'baileys';
import { Boom } from '@hapi/boom';
import { config } from '../config.js';

export type DeviceState = 'idle' | 'connecting' | 'qr' | 'connected' | 'disconnected';

class WhatsAppManager {
  private socket?: WASocket;
  private state: DeviceState = 'idle';
  private qr?: string;
  private reconnectTimer?: NodeJS.Timeout;

  status() {
    return { state: this.state, hasQr: Boolean(this.qr) };
  }

  getQr() {
    return this.qr;
  }

  async connect(): Promise<void> {
    if (this.state === 'connecting' || this.state === 'connected') return;

    this.state = 'connecting';
    const authDir = path.resolve(config.sessionDir, 'primary');
    await fs.mkdir(authDir, { recursive: true, mode: 0o700 });
    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    const socket = makeWASocket({
      auth: state,
      browser: Browsers.ubuntu('REDVOTE WA Gateway'),
      printQRInTerminal: false,
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    this.socket = socket;
    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        this.qr = qr;
        this.state = 'qr';
      }
      if (connection === 'open') {
        this.qr = undefined;
        this.state = 'connected';
      }
      if (connection === 'close') {
        this.qr = undefined;
        this.state = 'disconnected';
        const code = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        if (!loggedOut) this.scheduleReconnect();
      }
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect();
    }, 5000);
  }
}

export const whatsapp = new WhatsAppManager();
