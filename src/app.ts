import Fastify from 'fastify';
import { databaseHealth } from './db.js';
import { whatsapp } from './whatsapp/manager.js';

export function buildApp() {
  const app = Fastify({ logger: true });

  app.get('/api/v1/health', async (_request, reply) => {
    try {
      const database = await databaseHealth();
      return { ok: database, service: 'redvote-wa-gateway', database };
    } catch {
      return reply.code(503).send({ ok: false, service: 'redvote-wa-gateway', database: false });
    }
  });

  app.get('/api/v1/devices/primary', async () => whatsapp.status());

  app.post('/api/v1/devices/primary/connect', async (_request, reply) => {
    await whatsapp.connect();
    return reply.code(202).send(whatsapp.status());
  });

  app.get('/api/v1/devices/primary/qr', async (_request, reply) => {
    const qr = whatsapp.getQr();
    if (!qr) return reply.code(404).send({ error: 'QR_NOT_AVAILABLE' });
    return { qr };
  });

  return app;
}
