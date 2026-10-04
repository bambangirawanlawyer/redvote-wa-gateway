export type DeviceConnectionStatus =
  | 'DISCONNECTED'
  | 'PAIRING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ERROR';

export type DeviceSnapshot = {
  deviceId: string;
  tenantId: string;
  provider: 'baileys';
  status: DeviceConnectionStatus;
  phone?: string;
  hasQr: boolean;
  lastConnectedAt?: string;
  lastErrorCode?: string;
};

export type StartDeviceInput = {
  deviceId: string;
  tenantId: string;
};

export interface WhatsAppDeviceManager {
  start(input: StartDeviceInput): Promise<DeviceSnapshot>;
  status(deviceId: string): DeviceSnapshot | undefined;
  getQr(deviceId: string): string | undefined;
  shutdown(): Promise<void>;
}
