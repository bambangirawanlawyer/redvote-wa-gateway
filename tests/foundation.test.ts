import test from 'node:test';
import assert from 'node:assert/strict';

test('gateway foundation uses localhost production defaults', async () => {
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:5433/test';
  const { config } = await import('../src/config.js');
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.port, 3400);
});
