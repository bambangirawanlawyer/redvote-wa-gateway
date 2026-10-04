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

export type SendTextInput = {
  tenantId: string;
  deviceId: string;
  to: string;
  text: string;
};

export type SendTextResult = {
  tenantId: string;
  deviceId: string;
  to: string;
  providerMessageId?: string;
};

export type SendDocumentInput = {
  tenantId: string;
  deviceId: string;
  to: string;
  document: Buffer;
  filename: string;
  caption?: string;
};

export type SendDocumentResult = {
  tenantId: string;
  deviceId: string;
  to: string;
  providerMessageId?: string;
};

export interface WhatsAppDeviceManager {
  start(input: StartDeviceInput): Promise<DeviceSnapshot>;
  status(deviceId: string): DeviceSnapshot | undefined;
  getQr(deviceId: string): string | undefined;
  sendText(input: SendTextInput): Promise<SendTextResult>;
  sendDocument(input: SendDocumentInput): Promise<SendDocumentResult>;
  shutdown(): Promise<void>;
}
