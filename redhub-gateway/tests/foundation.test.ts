import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp, type HealthDatabase } from '../src/app.js';
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
  private current?: DeviceSnapshot;
  private qr?: string;
  lastDocument?: SendDocumentInput;

  connectForTest(): void {
    this.current = {
      deviceId: 'jember-main',
      tenantId: 'jember',
      provider: 'baileys',
      status: 'CONNECTED',
      hasQr: false
    };
  }

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
    if (input.text === 'provider-fail') throw new Error('PROVIDER_ERROR');
    if (!input.text.trim()) throw new Error('INVALID_TEXT');
    return {
      tenantId: input.tenantId,
      deviceId: input.deviceId,
      to: input.to,
      providerMessageId: 'fake-provider-message-id'
    };
  }

  async sendDocument(input: SendDocumentInput): Promise<SendDocumentResult> {
    if (input.deviceId !== 'jember-main') throw new Error('DEVICE_NOT_FOUND');
    if (input.tenantId !== 'jember') throw new Error('DEVICE_TENANT_MISMATCH');
    if (input.to === 'invalid') throw new Error('INVALID_PHONE');
    if (input.filename === 'provider-fail.pdf') throw new Error('PROVIDER_ERROR');
    this.lastDocument = input;
    return {
      tenantId: input.tenantId,
      deviceId: input.deviceId,
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


test('text delivery returns safe provider error', async () => {
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

test('document delivery rejects invalid source protocol', async () => {
  const devices = new FakeDeviceManager();
  devices.connectForTest();
  const app = buildApp({
    db: healthyDb(),
    devices,
    apiTokenSecret: 'test-secret',
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
