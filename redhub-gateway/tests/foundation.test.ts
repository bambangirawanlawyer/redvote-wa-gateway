import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp, type HealthDatabase } from '../src/app.js';
import type {
  DeviceSnapshot,
  SendTextInput,
  SendTextResult,
  StartDeviceInput,
  WhatsAppDeviceManager
} from '../src/whatsapp/types.js';

class FakeDeviceManager implements WhatsAppDeviceManager {
  private current?: DeviceSnapshot;
  private qr?: string;

  async start(input: StartDeviceInput): Promise<DeviceSnapshot> {
    this.current = {
      deviceId: input.deviceId,
      tenantId: input.tenantId,
      provider: 'baileys',
      status: 'PAIRING',
      hasQr: true
    };
    this.qr = 'fake-qr-payload';
    return this.current;
  }

  status(deviceId: string): DeviceSnapshot | undefined {
    return this.current?.deviceId === deviceId ? this.current : undefined;
  }

  getQr(deviceId: string): string | undefined {
    return this.current?.deviceId === deviceId ? this.qr : undefined;
  }

  async sendText(input: SendTextInput): Promise<SendTextResult> {
    if (input.deviceId !== 'jember-main') throw new Error('DEVICE_NOT_FOUND');
    if (input.tenantId !== 'jember') throw new Error('DEVICE_TENANT_MISMATCH');
    if (input.to === 'invalid') throw new Error('INVALID_PHONE');
    if (!input.text.trim()) throw new Error('INVALID_TEXT');
    return {
      tenantId: input.tenantId,
      deviceId: input.deviceId,
      to: input.to,
      providerMessageId: 'fake-provider-message-id'
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
      url: '/api/v1/devices/jember-main/status',
      headers: { authorization: 'Bearer test-secret' }
    });

    assert.equal(status.statusCode, 200);
    assert.equal(status.json().tenantId, 'jember');

    const pairing = await app.inject({
      method: 'GET',
      url: '/api/v1/devices/jember-main/pairing',
      headers: { authorization: 'Bearer test-secret' }
    });

    assert.equal(pairing.statusCode, 200);
    assert.equal(pairing.json().qr, 'fake-qr-payload');

    const png = await app.inject({
      method: 'GET',
      url: '/api/v1/devices/jember-main/pairing.png',
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
  const app = buildApp({
    db: healthyDb(),
    devices: new FakeDeviceManager(),
    apiTokenSecret: 'test-secret',
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
  const app = buildApp({
    db: healthyDb(),
    devices: new FakeDeviceManager(),
    apiTokenSecret: 'test-secret',
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
  const app = buildApp({
    db: healthyDb(),
    devices: new FakeDeviceManager(),
    apiTokenSecret: 'test-secret',
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
