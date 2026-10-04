import Fastify, { type FastifyInstance } from 'fastify';

export type HealthDatabase = {
  query: (sql: string, params?: unknown[]) => Promise<unknown>;
};

export type BuildAppOptions = {
  db: HealthDatabase;
  logger?: boolean | Record<string, unknown>;
  serviceVersion?: string;
};

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? true
  });

  app.get('/health', async (_request, reply) => {
    try {
      await options.db.query('SELECT 1');
      return reply.code(200).send({
        status: 'ok',
        service: 'redhub-wa-gateway',
        version: options.serviceVersion ?? '0.1.0',
        database: 'ok'
      });
    } catch {
      return reply.code(503).send({
        status: 'degraded',
        service: 'redhub-wa-gateway',
        version: options.serviceVersion ?? '0.1.0',
        database: 'unavailable'
      });
    }
  });

  return app;
}
