import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp, type HealthDatabase } from '../src/app.js';

test('GET /health returns ok when database is reachable', async () => {
  const db: HealthDatabase = {
    query: async () => ({ rows: [{ '?column?': 1 }] })
  };

  const app = buildApp({ db, logger: false, serviceVersion: 'test' });

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

  const app = buildApp({ db, logger: false, serviceVersion: 'test' });

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
