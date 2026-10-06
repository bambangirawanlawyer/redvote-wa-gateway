import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp, type HealthDatabase } from '../src/app.js';
import {
  createDocumentUrlPolicy,
  fetchPdfWithPolicy,
  isPrivateOrReservedAddress,
  validateDocumentUrl
} from '../src/security.js';
import type {
  DeviceSnapshot,
  SendDocumentInput,
  SendDocumentResult,
  SendTextInput,
  SendTextResult,
  StartDeviceInput,
  WhatsAppDeviceManager
} from '../src/whatsapp/types.js';

class FakeDeviceManager implements WhatsAppDeviceManager {
  private readonly devices = new Map<string, DeviceSnapshot>();
  private readonly qrs = new Map<string, string>();
  lastDocument?: SendDocumentInput;

  private key(tenantId: string, deviceId: string): string {
    return `${tenantId}::${deviceId}`;
  }

  connectForTest(tenantId = 'jember', deviceId = 'jember-main'): void {
    this.devices.set(this.key(tenantId, deviceId), {
      deviceId,
      tenantId,
      provider: 'baileys',
      status: 'CONNECTED',
      hasQr: false
    });
  }

  async start(input: StartDeviceInput): Promise<DeviceSnapshot> {
    const snapshot: DeviceSnapshot = {
      deviceId: input.deviceId,
      tenantId: input.tenantId,
      provider: 'baileys',
      status: 'PAIRING',
      hasQr: true
    };
    const key = this.key(input.tenantId, input.deviceId);
    this.devices.set(key, snapshot);
    this.qrs.set(key, 'fake-qr-payload');
    return snapshot;
  }

  async restorePersistedSessions(): Promise<DeviceSnapshot[]> {
    return this.list();
  }

  list(tenantId?: string): DeviceSnapshot[] {
    return [...this.devices.values()].filter(
      (device) => !tenantId || device.tenantId === tenantId
    );
  }

  status(deviceId: string, tenantId?: string): DeviceSnapshot | undefined {
    if (tenantId) return this.devices.get(this.key(tenantId, deviceId));
    const matches = this.list().filter((device) => device.deviceId === deviceId);
    return matches.length === 1 ? matches[0] : undefined;
  }

  getQr(deviceId: string, tenantId?: string): string | undefined {
    if (tenantId) return this.qrs.get(this.key(tenantId, deviceId));
    const matches = this.list().filter((device) => device.deviceId === deviceId);
    return matches.length === 1
      ? this.qrs.get(this.key(matches[0]!.tenantId, deviceId))
      : undefined;
  }

  private resolveDevice(tenantId: string, deviceId?: string): DeviceSnapshot {
    if (deviceId) {
      const device = this.devices.get(this.key(tenantId, deviceId));
      if (device) return device;
      if (this.list().some((candidate) => candidate.deviceId === deviceId)) {
        throw new Error('DEVICE_TENANT_MISMATCH');
      }
      throw new Error('DEVICE_NOT_FOUND');
    }

    const tenantDevices = this.list(tenantId);
    if (tenantDevices.length === 0) throw new Error('DEVICE_NOT_FOUND');
    if (tenantDevices.length > 1) throw new Error('DEVICE_REQUIRED');
    return tenantDevices[0]!;
  }

  async sendText(input: SendTextInput): Promise<SendTextResult> {
    const device = this.resolveDevice(input.tenantId, input.deviceId);
    if (input.to === 'invalid') throw new Error('INVALID_PHONE');
    if (input.text === 'provider-fail') throw new Error('PROVIDER_ERROR');
    if (!input.text.trim()) throw new Error('INVALID_TEXT');
    return {
      tenantId: input.tenantId,
      deviceId: device.deviceId,
      to: input.to,
      providerMessageId: 'fake-provider-message-id'
    };
  }

  async sendDocument(input: SendDocumentInput): Promise<SendDocumentResult> {
    const device = this.resolveDevice(input.tenantId, input.deviceId);
    if (input.to === 'invalid') throw new Error('INVALID_PHONE');
    if (input.filename === 'provider-fail.pdf') throw new Error('PROVIDER_ERROR');
    this.lastDocument = input;
    return {
      tenantId: input.tenantId,
      deviceId: device.deviceId,
      to: input.to,
      providerMessageId: 'fake-document-message-id'
    };
  }

  async shutdown(): Promise<void> {}
}

function healthyDb(): HealthDatabase {
  return {
    query: async () => ({ rows: [{ '?column?': 1 }] })
  };
}

test('GET /health returns ok when database is reachable', async () => {
  const app = buildApp({
    db: healthyDb(),
    devices: new FakeDeviceManager(),
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false,
    serviceVersion: 'test'
  });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      status: 'ok',
      service: 'redhub-wa-gateway',
      version: 'test',
      database: 'ok'
    });
  } finally {
    await app.close();
  }
});

test('GET /health returns degraded when database is unavailable', async () => {
  const db: HealthDatabase = {
    query: async () => {
      throw new Error('database offline');
    }
  };

  const app = buildApp({
    db,
    devices: new FakeDeviceManager(),
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false,
    serviceVersion: 'test'
  });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.json(), {
      status: 'degraded',
      service: 'redhub-wa-gateway',
      version: 'test',
      database: 'unavailable'
    });
  } finally {
    await app.close();
  }
});

test('pairing endpoint rejects missing bearer token', async () => {
  const app = buildApp({
    db: healthyDb(),
    devices: new FakeDeviceManager(),
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/devices/jember-main/pair',
      payload: { tenantId: 'jember' }
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, 'UNAUTHORIZED');
  } finally {
    await app.close();
  }
});

test('pairing flow exposes protected JSON and PNG QR state', async () => {
  const devices = new FakeDeviceManager();
  const app = buildApp({
    db: healthyDb(),
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });

  try {
    const pair = await app.inject({
      method: 'POST',
      url: '/api/v1/devices/jember-main/pair',
      headers: { authorization: 'Bearer test-secret' },
      payload: { tenantId: 'jember' }
    });

    assert.equal(pair.statusCode, 202);
    assert.equal(pair.json().status, 'PAIRING');
    assert.equal(pair.json().hasQr, true);

    const status = await app.inject({
      method: 'GET',
      url: '/api/v1/devices/jember-main/status?tenantId=jember',
      headers: { authorization: 'Bearer test-secret' }
    });

    assert.equal(status.statusCode, 200);
    assert.equal(status.json().tenantId, 'jember');

    const pairing = await app.inject({
      method: 'GET',
      url: '/api/v1/devices/jember-main/pairing?tenantId=jember',
      headers: { authorization: 'Bearer test-secret' }
    });

    assert.equal(pairing.statusCode, 200);
    assert.equal(pairing.json().qr, 'fake-qr-payload');

    const png = await app.inject({
      method: 'GET',
      url: '/api/v1/devices/jember-main/pairing.png?tenantId=jember',
      headers: { authorization: 'Bearer test-secret' }
    });

    assert.equal(png.statusCode, 200);
    assert.match(png.headers['content-type'] ?? '', /^image\/png/);
    assert.ok(png.rawPayload.length > 100);
  } finally {
    await app.close();
  }
});


test('text delivery rejects missing bearer token', async () => {
  const app = buildApp({
    db: healthyDb(),
    devices: new FakeDeviceManager(),
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/text',
      payload: {
        tenantId: 'jember',
        deviceId: 'jember-main',
        to: '628123456789',
        text: 'Test'
      }
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, 'UNAUTHORIZED');
  } finally {
    await app.close();
  }
});

test('text delivery returns provider message id', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest();
  const app = buildApp({
    db: healthyDb(),
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/text',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        tenantId: 'jember',
        deviceId: 'jember-main',
        to: '628123456789',
        text: 'Test WA-003',
        requestId: 'req-wa003-test'
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().success, true);
    assert.equal(response.json().providerMessageId, 'fake-provider-message-id');
    assert.equal(response.json().requestId, 'req-wa003-test');
  } finally {
    await app.close();
  }
});

test('text delivery rejects cross-tenant device use', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest();
  const app = buildApp({
    db: healthyDb(),
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/text',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        tenantId: 'tenant-lain',
        deviceId: 'jember-main',
        to: '628123456789',
        text: 'Test'
      }
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, 'DEVICE_TENANT_MISMATCH');
  } finally {
    await app.close();
  }
});

test('text delivery rejects invalid destination', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest();
  const app = buildApp({
    db: healthyDb(),
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/text',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        tenantId: 'jember',
        deviceId: 'jember-main',
        to: 'invalid',
        text: 'Test'
      }
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, 'INVALID_PHONE');
  } finally {
    await app.close();
  }
});


test('text delivery returns safe provider error', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest();
  const app = buildApp({
    db: healthyDb(),
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/text',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        tenantId: 'jember',
        deviceId: 'jember-main',
        to: '628123456789',
        text: 'provider-fail',
        requestId: 'req-provider-fail'
      }
    });

    assert.equal(response.statusCode, 502);
    assert.equal(response.json().success, false);
    assert.equal(response.json().error.code, 'PROVIDER_ERROR');
    assert.equal(response.json().requestId, 'req-provider-fail');
    assert.equal(JSON.stringify(response.json()).includes('test-secret'), false);
    assert.equal(JSON.stringify(response.json()).includes('stack'), false);
  } finally {
    await app.close();
  }
});


test('document delivery rejects missing bearer token', async () => {
  const app = buildApp({
    db: healthyDb(),
    devices: new FakeDeviceManager(),
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/document',
      payload: {
        tenantId: 'jember',
        deviceId: 'jember-main',
        to: '628123456789',
        documentUrl: 'https://example.test/undangan.pdf',
        filename: 'undangan.pdf'
      }
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, 'UNAUTHORIZED');
  } finally {
    await app.close();
  }
});

test('document delivery fetches PDF in memory and sends filename/caption', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest();
  const app = buildApp({
    db: healthyDb(),
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });
  const originalFetch = globalThis.fetch;
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');

  globalThis.fetch = (async () =>
    new Response(pdf, {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-length': String(pdf.length)
      }
    })) as typeof fetch;

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/document',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        tenantId: 'jember',
        deviceId: 'jember-main',
        to: '628123456789',
        documentUrl: 'https://example.test/undangan.pdf',
        filename: '../Undangan: Rapat',
        caption: 'Undangan resmi WA-004',
        requestId: 'req-wa004-test'
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().success, true);
    assert.equal(response.json().providerMessageId, 'fake-document-message-id');
    assert.equal(response.json().filename, 'Undangan_ Rapat.pdf');
    assert.equal(response.json().requestId, 'req-wa004-test');
    assert.equal(devices.lastDocument?.filename, 'Undangan_ Rapat.pdf');
    assert.equal(devices.lastDocument?.caption, 'Undangan resmi WA-004');
    assert.equal(devices.lastDocument?.document.subarray(0, 5).toString('ascii'), '%PDF-');
  } finally {
    globalThis.fetch = originalFetch;
    await app.close();
  }
});


test('document delivery accepts bounded inline PNG without public URL', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest();
  const app = buildApp({
    db: healthyDb(),
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });
  const png = Buffer.from([
    137, 80, 78, 71, 13, 10, 26, 10,
    0, 0, 0, 0, 73, 69, 78, 68
  ]);

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/document',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        tenantId: 'jember',
        deviceId: 'jember-main',
        to: '628123456789',
        documentBase64: png.toString('base64'),
        mimeType: 'image/png',
        filename: 'QR-RedHub',
        caption: 'QR kehadiran',
        requestId: 'req-inline-qr'
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().success, true);
    assert.equal(response.json().filename, 'QR-RedHub.png');
    assert.equal(devices.lastDocument?.mimeType, 'image/png');
    assert.equal(devices.lastDocument?.filename, 'QR-RedHub.png');
    assert.deepEqual(devices.lastDocument?.document, png);
  } finally {
    await app.close();
  }
});

test('document delivery rejects ambiguous inline and URL sources', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest();
  const app = buildApp({
    db: healthyDb(),
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/document',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        tenantId: 'jember',
        deviceId: 'jember-main',
        to: '628123456789',
        documentUrl: 'https://example.test/undangan.pdf',
        documentBase64: 'iVBORw0KGgo=',
        mimeType: 'image/png',
        filename: 'ambiguous'
      }
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, 'INVALID_REQUEST');
  } finally {
    await app.close();
  }
});

test('document delivery rejects invalid source protocol', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest();
  const app = buildApp({
    db: healthyDb(),
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/document',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        tenantId: 'jember',
        deviceId: 'jember-main',
        to: '628123456789',
        documentUrl: 'file:///tmp/undangan.pdf',
        filename: 'undangan.pdf'
      }
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, 'INVALID_DOCUMENT_SOURCE');
  } finally {
    await app.close();
  }
});

test('document delivery rejects non-PDF content type', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest();
  const app = buildApp({
    db: healthyDb(),
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response('not a pdf', {
      status: 200,
      headers: { 'content-type': 'text/plain' }
    })) as typeof fetch;

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/document',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        tenantId: 'jember',
        deviceId: 'jember-main',
        to: '628123456789',
        documentUrl: 'https://example.test/not-pdf',
        filename: 'undangan.pdf'
      }
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, 'UNSUPPORTED_DOCUMENT_TYPE');
  } finally {
    globalThis.fetch = originalFetch;
    await app.close();
  }
});

test('document delivery rejects oversized PDF before reading body', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest();
  const app = buildApp({
    db: healthyDb(),
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(Buffer.from('%PDF-1.4'), {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-length': String(10 * 1024 * 1024 + 1)
      }
    })) as typeof fetch;

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/document',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        tenantId: 'jember',
        deviceId: 'jember-main',
        to: '628123456789',
        documentUrl: 'https://example.test/large.pdf',
        filename: 'large.pdf'
      }
    });

    assert.equal(response.statusCode, 413);
    assert.equal(response.json().error.code, 'DOCUMENT_TOO_LARGE');
  } finally {
    globalThis.fetch = originalFetch;
    await app.close();
  }
});

test('document delivery rejects cross-tenant access before fetching PDF', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest();
  const app = buildApp({
    db: healthyDb(),
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;

  globalThis.fetch = (async () => {
    fetchCalled = true;
    throw new Error('fetch must not run');
  }) as typeof fetch;

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/document',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        tenantId: 'tenant-lain',
        deviceId: 'jember-main',
        to: '628123456789',
        documentUrl: 'https://example.test/undangan.pdf',
        filename: 'undangan.pdf'
      }
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, 'DEVICE_TENANT_MISMATCH');
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
    await app.close();
  }
});

test('document delivery returns safe provider error', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest();
  const app = buildApp({
    db: healthyDb(),
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });
  const originalFetch = globalThis.fetch;
  const pdf = Buffer.from('%PDF-1.4\n%%EOF\n');

  globalThis.fetch = (async () =>
    new Response(pdf, {
      status: 200,
      headers: { 'content-type': 'application/pdf' }
    })) as typeof fetch;

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/document',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        tenantId: 'jember',
        deviceId: 'jember-main',
        to: '628123456789',
        documentUrl: 'https://example.test/provider-fail.pdf',
        filename: 'provider-fail.pdf',
        requestId: 'req-wa004-provider-fail'
      }
    });

    assert.equal(response.statusCode, 502);
    assert.equal(response.json().error.code, 'PROVIDER_ERROR');
    assert.equal(response.json().requestId, 'req-wa004-provider-fail');
    assert.equal(JSON.stringify(response.json()).includes('test-secret'), false);
    assert.equal(JSON.stringify(response.json()).includes('stack'), false);
  } finally {
    globalThis.fetch = originalFetch;
    await app.close();
  }
});


test('device status and listing require tenant context', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest('tenant-a', 'shared-device');
  const app = buildApp({
    db: healthyDb(),
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });

  try {
    const status = await app.inject({
      method: 'GET',
      url: '/api/v1/devices/shared-device/status',
      headers: { authorization: 'Bearer test-secret' }
    });
    assert.equal(status.statusCode, 400);
    assert.equal(status.json().error.code, 'TENANT_REQUIRED');

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/devices',
      headers: { authorization: 'Bearer test-secret' }
    });
    assert.equal(list.statusCode, 400);
    assert.equal(list.json().error.code, 'TENANT_REQUIRED');
  } finally {
    await app.close();
  }
});

test('same device id can coexist in different tenants with isolated lookup', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest('tenant-a', 'shared-device');
  devices.connectForTest('tenant-b', 'shared-device');
  const app = buildApp({
    db: healthyDb(),
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });

  try {
    const a = await app.inject({
      method: 'GET',
      url: '/api/v1/devices/shared-device/status?tenantId=tenant-a',
      headers: { authorization: 'Bearer test-secret' }
    });
    const b = await app.inject({
      method: 'GET',
      url: '/api/v1/devices/shared-device/status?tenantId=tenant-b',
      headers: { authorization: 'Bearer test-secret' }
    });
    const listA = await app.inject({
      method: 'GET',
      url: '/api/v1/devices?tenantId=tenant-a',
      headers: { authorization: 'Bearer test-secret' }
    });

    assert.equal(a.statusCode, 200);
    assert.equal(a.json().tenantId, 'tenant-a');
    assert.equal(b.statusCode, 200);
    assert.equal(b.json().tenantId, 'tenant-b');
    assert.equal(listA.statusCode, 200);
    assert.equal(listA.json().devices.length, 1);
    assert.equal(listA.json().devices[0].tenantId, 'tenant-a');
  } finally {
    await app.close();
  }
});

test('single-device tenant is implicit default for text delivery', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest('tenant-a', 'main');
  const app = buildApp({
    db: healthyDb(),
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/text',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        tenantId: 'tenant-a',
        to: '628123456789',
        text: 'Implicit default test'
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().success, true);
    assert.equal(response.json().deviceId, 'main');
  } finally {
    await app.close();
  }
});

test('multi-device tenant requires explicit deviceId', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest('tenant-a', 'main');
  devices.connectForTest('tenant-a', 'secondary');
  const app = buildApp({
    db: healthyDb(),
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/text',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        tenantId: 'tenant-a',
        to: '628123456789',
        text: 'Must choose device'
      }
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, 'DEVICE_REQUIRED');
  } finally {
    await app.close();
  }
});


test('text delivery writes masked SENT audit log and generates requestId', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest();
  const calls: Array<{ sql: string; params?: unknown[] }> = [];
  const db: HealthDatabase = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      return { rows: [] };
    }
  };
  const app = buildApp({
    db,
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/text',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        tenantId: 'jember',
        deviceId: 'jember-main',
        to: '628123456789',
        text: 'WA-006 log success'
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().success, true);
    assert.match(response.json().requestId, /^[0-9a-f-]{36}$/i);

    const insert = calls.find((call) => call.sql.includes('INSERT INTO delivery_logs'));
    assert.ok(insert);
    assert.equal(insert.params?.[0], response.json().requestId);
    assert.equal(insert.params?.[1], 'jember');
    assert.equal(insert.params?.[2], 'jember-main');
    assert.equal(insert.params?.[3], 'TEXT');
    assert.equal(insert.params?.[4], '6281*****789');
    assert.notEqual(insert.params?.[4], '628123456789');
    assert.equal(insert.params?.[5], 'fake-provider-message-id');
    assert.equal(insert.params?.[6], 'SENT');
    assert.equal(insert.params?.[7], null);
  } finally {
    await app.close();
  }
});

test('failed text delivery writes masked FAILED audit log with safe error', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest();
  const calls: Array<{ sql: string; params?: unknown[] }> = [];
  const db: HealthDatabase = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      return { rows: [] };
    }
  };
  const app = buildApp({
    db,
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/text',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        tenantId: 'jember',
        deviceId: 'jember-main',
        to: 'invalid',
        text: 'WA-006 failure',
        requestId: 'wa006-failure-001'
      }
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, 'INVALID_PHONE');

    const insert = calls.find((call) => call.sql.includes('INSERT INTO delivery_logs'));
    assert.ok(insert);
    assert.equal(insert.params?.[0], 'wa006-failure-001');
    assert.equal(insert.params?.[3], 'TEXT');
    assert.equal(insert.params?.[4], '***');
    assert.equal(insert.params?.[6], 'FAILED');
    assert.equal(insert.params?.[7], 'INVALID_PHONE');
    assert.equal(insert.params?.[8], 'Unable to send WhatsApp text message');
  } finally {
    await app.close();
  }
});

test('document delivery writes DOCUMENT audit log', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest();
  const calls: Array<{ sql: string; params?: unknown[] }> = [];
  const db: HealthDatabase = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      return { rows: [] };
    }
  };
  const app = buildApp({
    db,
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });
  const originalFetch = globalThis.fetch;
  const pdf = Buffer.from('%PDF-1.4\n%%EOF\n');

  globalThis.fetch = (async () =>
    new Response(pdf, {
      status: 200,
      headers: { 'content-type': 'application/pdf' }
    })) as typeof fetch;

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/document',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        tenantId: 'jember',
        deviceId: 'jember-main',
        to: '628123456789',
        documentUrl: 'https://example.test/wa006.pdf',
        filename: 'wa006.pdf',
        requestId: 'wa006-document-001'
      }
    });

    assert.equal(response.statusCode, 200);
    const insert = calls.find((call) => call.sql.includes('INSERT INTO delivery_logs'));
    assert.ok(insert);
    assert.equal(insert.params?.[0], 'wa006-document-001');
    assert.equal(insert.params?.[3], 'DOCUMENT');
    assert.equal(insert.params?.[4], '6281*****789');
    assert.equal(insert.params?.[5], 'fake-document-message-id');
    assert.equal(insert.params?.[6], 'SENT');
  } finally {
    globalThis.fetch = originalFetch;
    await app.close();
  }
});

test('delivery log database failure does not turn successful send into failure', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest();
  const db: HealthDatabase = {
    query: async (sql) => {
      if (sql.includes('INSERT INTO delivery_logs')) {
        throw new Error('audit database unavailable');
      }
      return { rows: [] };
    }
  };
  const app = buildApp({
    db,
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/text',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        tenantId: 'jember',
        deviceId: 'jember-main',
        to: '628123456789',
        text: 'WA-006 audit failure isolation',
        requestId: 'wa006-audit-failure'
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().success, true);
    assert.equal(response.json().requestId, 'wa006-audit-failure');
  } finally {
    await app.close();
  }
});

test('delivery endpoint rejects overlong requestId', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest();
  const app = buildApp({
    db: healthyDb(),
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/text',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        tenantId: 'jember',
        deviceId: 'jember-main',
        to: '628123456789',
        text: 'WA-006 request id limit',
        requestId: 'x'.repeat(129)
      }
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, 'INVALID_REQUEST_ID');
  } finally {
    await app.close();
  }
});


test('security policy rejects private/reserved addresses', async () => {
  assert.equal(isPrivateOrReservedAddress('127.0.0.1'), true);
  assert.equal(isPrivateOrReservedAddress('10.0.0.1'), true);
  assert.equal(isPrivateOrReservedAddress('172.16.0.1'), true);
  assert.equal(isPrivateOrReservedAddress('192.168.1.1'), true);
  assert.equal(isPrivateOrReservedAddress('169.254.169.254'), true);
  assert.equal(isPrivateOrReservedAddress('::1'), true);
  assert.equal(isPrivateOrReservedAddress('fc00::1'), true);
  assert.equal(isPrivateOrReservedAddress('8.8.8.8'), false);
});

test('document URL policy requires HTTPS unless host is explicitly allowlisted', async () => {
  const policy = createDocumentUrlPolicy([]);

  await assert.rejects(
    () => validateDocumentUrl('http://8.8.8.8/file.pdf', policy),
    /INVALID_DOCUMENT_SOURCE/
  );
  await assert.rejects(
    () => validateDocumentUrl('https://127.0.0.1/file.pdf', policy),
    /INVALID_DOCUMENT_SOURCE/
  );
  await assert.rejects(
    () => validateDocumentUrl('https://user:pass@example.com/file.pdf', policy),
    /INVALID_DOCUMENT_SOURCE/
  );

  const allowed = await validateDocumentUrl(
    'http://host.docker.internal/file.pdf',
    createDocumentUrlPolicy(['host.docker.internal'])
  );
  assert.equal(allowed.hostname, 'host.docker.internal');
});

test('document URL redirect cannot escape to private address', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(null, {
      status: 302,
      headers: { location: 'http://127.0.0.1/private.pdf' }
    })) as typeof fetch;

  try {
    await assert.rejects(
      () =>
        fetchPdfWithPolicy(
          'http://example.test/start.pdf',
          createDocumentUrlPolicy(['example.test']),
          10 * 1024 * 1024
        ),
      /INVALID_DOCUMENT_SOURCE/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('payload validation rejects unsafe tenant/device ids', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest();
  const app = buildApp({
    db: healthyDb(),
    devices,
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/text',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        tenantId: '../tenant',
        deviceId: 'jember-main',
        to: '628123456789',
        text: 'must-not-send'
      }
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, 'INVALID_TENANT_OR_DEVICE_ID');
  } finally {
    await app.close();
  }
});

test('Fastify body limit rejects oversized JSON payload', async () => {
  const app = buildApp({
    db: healthyDb(),
    devices: new FakeDeviceManager(),
    apiTokenSecret: 'test-secret',
    documentAllowedHosts: ['example.test'],
    logger: false
  });

  try {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/messages/text',
      headers: { authorization: 'Bearer test-secret' },
      payload: {
        tenantId: 'jember',
        to: '628123456789',
        text: 'x'.repeat(70 * 1024)
      }
    });

    assert.equal(response.statusCode, 413);
  } finally {
    await app.close();
  }
});
