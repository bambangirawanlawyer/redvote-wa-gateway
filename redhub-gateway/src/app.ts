import { timingSafeEqual } from 'node:crypto';
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest
} from 'fastify';
import QRCode from 'qrcode';
import type { WhatsAppDeviceManager } from './whatsapp/types.js';

export type HealthDatabase = {
  query: (sql: string, params?: unknown[]) => Promise<unknown>;
};

export type BuildAppOptions = {
  db: HealthDatabase;
  devices: WhatsAppDeviceManager;
  apiTokenSecret: string;
  logger?: boolean | Record<string, unknown>;
  serviceVersion?: string;
};

function secureBearerMatches(header: string | undefined, secret: string): boolean {
  if (!header?.startsWith('Bearer ')) return false;

  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);

  if (supplied.length !== expected.length) return false;
  return timingSafeEqual(supplied, expected);
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? true
  });

  async function requireInternalAuth(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    if (!secureBearerMatches(request.headers.authorization, options.apiTokenSecret)) {
      await reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }
  }

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

  app.post(
    '/api/v1/devices/:deviceId/pair',
    { preHandler: requireInternalAuth },
    async (request, reply) => {
      const { deviceId } = request.params as { deviceId: string };
      const body = (request.body ?? {}) as { tenantId?: string };

      if (!body.tenantId) {
        return reply.code(400).send({
          error: {
            code: 'TENANT_REQUIRED',
            message: 'tenantId is required'
          }
        });
      }

      try {
        const snapshot = await options.devices.start({
          deviceId,
          tenantId: body.tenantId
        });

        return reply.code(202).send(snapshot);
      } catch (error) {
        const code = error instanceof Error ? error.message : 'DEVICE_START_FAILED';
        const statusCode =
          code.startsWith('INVALID_') || code === 'DEVICE_TENANT_MISMATCH'
            ? 400
            : 500;

        return reply.code(statusCode).send({
          error: {
            code,
            message: 'Unable to start WhatsApp device'
          }
        });
      }
    }
  );

  app.get(
    '/api/v1/devices/:deviceId/status',
    { preHandler: requireInternalAuth },
    async (request, reply) => {
      const { deviceId } = request.params as { deviceId: string };
      const snapshot = options.devices.status(deviceId);

      if (!snapshot) {
        return reply.code(404).send({
          error: {
            code: 'DEVICE_NOT_FOUND',
            message: 'Device is not started'
          }
        });
      }

      return snapshot;
    }
  );

  app.get(
    '/api/v1/devices/:deviceId/pairing',
    { preHandler: requireInternalAuth },
    async (request, reply) => {
      const { deviceId } = request.params as { deviceId: string };
      const qr = options.devices.getQr(deviceId);

      if (!qr) {
        return reply.code(404).send({
          error: {
            code: 'QR_NOT_AVAILABLE',
            message: 'QR is not currently available'
          }
        });
      }

      return {
        deviceId,
        status: 'PAIRING',
        qr
      };
    }
  );

  app.get(
    '/api/v1/devices/:deviceId/pairing.png',
    { preHandler: requireInternalAuth },
    async (request, reply) => {
      const { deviceId } = request.params as { deviceId: string };
      const qr = options.devices.getQr(deviceId);

      if (!qr) {
        return reply.code(404).send({
          error: {
            code: 'QR_NOT_AVAILABLE',
            message: 'QR is not currently available'
          }
        });
      }

      const png = await QRCode.toBuffer(qr, {
        type: 'png',
        width: 360,
        margin: 1,
        errorCorrectionLevel: 'M'
      });

      return reply.type('image/png').send(png);
    }
  );

  return app;
}
