import { timingSafeEqual } from 'node:crypto';
import { basename } from 'node:path';
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

const MAX_PDF_BYTES = 10 * 1024 * 1024;

function sanitizePdfFilename(value: string): string {
  const safe = basename(value.trim()).replace(/[^A-Za-z0-9._ -]/g, '_').slice(0, 120);
  if (!safe || safe === '.' || safe === '..') throw new Error('INVALID_DOCUMENT_FILENAME');
  return safe.toLowerCase().endsWith('.pdf') ? safe : `${safe}.pdf`;
}

async function fetchPdfDocument(documentUrl: string): Promise<Buffer> {
  let url: URL;
  try {
    url = new URL(documentUrl);
  } catch {
    throw new Error('INVALID_DOCUMENT_SOURCE');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('INVALID_DOCUMENT_SOURCE');
  }

  let response: Response;
  try {
    response = await fetch(url, { redirect: 'follow' });
  } catch {
    throw new Error('INVALID_DOCUMENT_SOURCE');
  }

  if (!response.ok) throw new Error('INVALID_DOCUMENT_SOURCE');

  const contentLength = Number(response.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_PDF_BYTES) {
    throw new Error('DOCUMENT_TOO_LARGE');
  }

  const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
  if (!contentType.includes('application/pdf')) {
    throw new Error('UNSUPPORTED_DOCUMENT_TYPE');
  }

  if (!response.body) throw new Error('INVALID_DOCUMENT_SOURCE');

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_PDF_BYTES) {
      await reader.cancel();
      throw new Error('DOCUMENT_TOO_LARGE');
    }
    chunks.push(Buffer.from(value));
  }

  if (totalBytes === 0) throw new Error('INVALID_DOCUMENT_SOURCE');
  const bytes = Buffer.concat(chunks, totalBytes);
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('UNSUPPORTED_DOCUMENT_TYPE');
  }
  return bytes;
}

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

  app.post(
    '/api/v1/messages/text',
    { preHandler: requireInternalAuth },
    async (request, reply) => {
      const body = (request.body ?? {}) as {
        tenantId?: string;
        deviceId?: string;
        to?: string;
        text?: string;
        requestId?: string;
      };

      if (!body.tenantId || !body.deviceId || !body.to || !body.text) {
        return reply.code(400).send({
          success: false,
          requestId: body.requestId,
          error: {
            code: 'INVALID_REQUEST',
            message: 'tenantId, deviceId, to, and text are required'
          }
        });
      }

      try {
        const result = await options.devices.sendText({
          tenantId: body.tenantId,
          deviceId: body.deviceId,
          to: body.to,
          text: body.text
        });

        return reply.code(200).send({
          success: true,
          tenantId: result.tenantId,
          deviceId: result.deviceId,
          to: result.to,
          providerMessageId: result.providerMessageId,
          requestId: body.requestId
        });
      } catch (error) {
        const code = error instanceof Error ? error.message : 'PROVIDER_ERROR';
        const statusCode =
          code === 'DEVICE_NOT_FOUND'
            ? 404
            : code === 'DEVICE_TENANT_MISMATCH'
              ? 403
              : code === 'DEVICE_NOT_CONNECTED'
                ? 409
                : code === 'INVALID_PHONE' || code === 'INVALID_TEXT'
                  ? 400
                  : 502;

        return reply.code(statusCode).send({
          success: false,
          requestId: body.requestId,
          error: {
            code,
            message: 'Unable to send WhatsApp text message'
          }
        });
      }
    }
  );

  app.post(
    '/api/v1/messages/document',
    { preHandler: requireInternalAuth },
    async (request, reply) => {
      const body = (request.body ?? {}) as {
        tenantId?: string;
        deviceId?: string;
        to?: string;
        documentUrl?: string;
        filename?: string;
        caption?: string;
        requestId?: string;
      };

      if (!body.tenantId || !body.deviceId || !body.to || !body.documentUrl || !body.filename) {
        return reply.code(400).send({
          success: false,
          requestId: body.requestId,
          error: {
            code: 'INVALID_REQUEST',
            message: 'tenantId, deviceId, to, documentUrl, and filename are required'
          }
        });
      }

      try {
        const device = options.devices.status(body.deviceId);
        if (!device) throw new Error('DEVICE_NOT_FOUND');
        if (device.tenantId !== body.tenantId) throw new Error('DEVICE_TENANT_MISMATCH');
        if (device.status !== 'CONNECTED') throw new Error('DEVICE_NOT_CONNECTED');

        const document = await fetchPdfDocument(body.documentUrl);
        const filename = sanitizePdfFilename(body.filename);
        const caption = body.caption?.trim();
        if (caption && caption.length > 1024) throw new Error('INVALID_DOCUMENT_CAPTION');

        const result = await options.devices.sendDocument({
          tenantId: body.tenantId,
          deviceId: body.deviceId,
          to: body.to,
          document,
          filename,
          caption: caption || undefined
        });

        return reply.code(200).send({
          success: true,
          tenantId: result.tenantId,
          deviceId: result.deviceId,
          to: result.to,
          filename,
          providerMessageId: result.providerMessageId,
          requestId: body.requestId
        });
      } catch (error) {
        const code = error instanceof Error ? error.message : 'PROVIDER_ERROR';
        const statusCode =
          code === 'DEVICE_NOT_FOUND'
            ? 404
            : code === 'DEVICE_TENANT_MISMATCH'
              ? 403
              : code === 'DEVICE_NOT_CONNECTED'
                ? 409
                : code === 'DOCUMENT_TOO_LARGE'
                  ? 413
                  : code === 'INVALID_PHONE' ||
                      code === 'INVALID_DOCUMENT_SOURCE' ||
                      code === 'INVALID_DOCUMENT_FILENAME' ||
                      code === 'INVALID_DOCUMENT_CAPTION' ||
                      code === 'UNSUPPORTED_DOCUMENT_TYPE'
                    ? 400
                    : 502;

        return reply.code(statusCode).send({
          success: false,
          requestId: body.requestId,
          error: {
            code,
            message: 'Unable to send WhatsApp PDF document'
          }
        });
      }
    }
  );

  return app;
}
