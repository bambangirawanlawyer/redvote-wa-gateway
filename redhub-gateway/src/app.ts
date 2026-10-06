import { randomUUID, timingSafeEqual } from 'node:crypto';
import { basename } from 'node:path';
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest
} from 'fastify';
import QRCode from 'qrcode';
import {
  insertDeliveryLog,
  type DeliveryLogInput
} from './delivery-log.js';
import {
  createDocumentUrlPolicy,
  fetchPdfWithPolicy
} from './security.js';
import type { WhatsAppDeviceManager } from './whatsapp/types.js';

export type HealthDatabase = {
  query: (sql: string, params?: unknown[]) => Promise<unknown>;
};

export type BuildAppOptions = {
  db: HealthDatabase;
  devices: WhatsAppDeviceManager;
  apiTokenSecret: string;
  documentAllowedHosts?: string[];
  logger?: boolean | Record<string, unknown>;
  serviceVersion?: string;
};

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_INLINE_DOCUMENT_BYTES = 32 * 1024;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

function isSafeId(value: string | undefined): value is string {
  return Boolean(value && SAFE_ID.test(value));
}

function sanitizeDocumentFilename(
  value: string,
  mimeType: 'application/pdf' | 'image/png'
): string {
  const safe = basename(value.trim()).replace(/[^A-Za-z0-9._ -]/g, '_').slice(0, 120);
  if (!safe || safe === '.' || safe === '..') throw new Error('INVALID_DOCUMENT_FILENAME');
  const extension = mimeType === 'image/png' ? '.png' : '.pdf';
  return safe.toLowerCase().endsWith(extension) ? safe : `${safe}${extension}`;
}

function decodeInlineDocument(
  value: string,
  mimeType: string | undefined
): { document: Buffer; mimeType: 'image/png' } {
  if (mimeType !== 'image/png') throw new Error('UNSUPPORTED_DOCUMENT_TYPE');
  const normalized = value.trim();
  if (!normalized || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    throw new Error('INVALID_DOCUMENT_BASE64');
  }
  const document = Buffer.from(normalized, 'base64');
  if (!document.length || document.length > MAX_INLINE_DOCUMENT_BYTES) {
    throw new Error(document.length > MAX_INLINE_DOCUMENT_BYTES
      ? 'DOCUMENT_TOO_LARGE'
      : 'INVALID_DOCUMENT_BASE64');
  }
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (document.length < pngSignature.length ||
      !document.subarray(0, pngSignature.length).equals(pngSignature)) {
    throw new Error('UNSUPPORTED_DOCUMENT_TYPE');
  }
  return { document, mimeType: 'image/png' };
}

function secureBearerMatches(header: string | undefined, secret: string): boolean {
  if (!header?.startsWith('Bearer ')) return false;

  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);

  if (supplied.length !== expected.length) return false;
  return timingSafeEqual(supplied, expected);
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const documentUrlPolicy = createDocumentUrlPolicy(options.documentAllowedHosts ?? []);
  const app = Fastify({
    logger: options.logger ?? true,
    bodyLimit: 64 * 1024
  });

  async function recordDeliveryLogSafe(input: DeliveryLogInput): Promise<void> {
    try {
      await insertDeliveryLog(options.db, input);
    } catch {
      app.log.error(
        {
          requestId: input.requestId,
          tenantId: input.tenantId,
          deviceId: input.deviceId,
          messageType: input.messageType,
          result: input.result,
          errorCode: input.errorCode
        },
        'delivery log persistence failed'
      );
    }
  }

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
      if (!isSafeId(body.tenantId) || !isSafeId(deviceId)) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_TENANT_OR_DEVICE_ID',
            message: 'tenantId or deviceId is invalid'
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
    '/api/v1/devices',
    { preHandler: requireInternalAuth },
    async (request, reply) => {
      const { tenantId } = (request.query ?? {}) as { tenantId?: string };
      if (!tenantId) {
        return reply.code(400).send({
          error: {
            code: 'TENANT_REQUIRED',
            message: 'tenantId is required'
          }
        });
      }
      if (!isSafeId(tenantId)) {
        return reply.code(400).send({
          error: { code: 'INVALID_TENANT_ID', message: 'tenantId is invalid' }
        });
      }
      return { tenantId, devices: options.devices.list(tenantId) };
    }
  );

  app.get(
    '/api/v1/devices/:deviceId/status',
    { preHandler: requireInternalAuth },
    async (request, reply) => {
      const { deviceId } = request.params as { deviceId: string };
      const { tenantId } = (request.query ?? {}) as { tenantId?: string };
      if (!tenantId) {
        return reply.code(400).send({
          error: {
            code: 'TENANT_REQUIRED',
            message: 'tenantId is required'
          }
        });
      }
      if (!isSafeId(tenantId) || !isSafeId(deviceId)) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_TENANT_OR_DEVICE_ID',
            message: 'tenantId or deviceId is invalid'
          }
        });
      }
      const snapshot = options.devices.status(deviceId, tenantId);

      if (!snapshot) {
        return reply.code(404).send({
          error: {
            code: 'DEVICE_NOT_FOUND',
            message: 'Device is not started for this tenant'
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
      const { tenantId } = (request.query ?? {}) as { tenantId?: string };
      if (!tenantId) {
        return reply.code(400).send({
          error: {
            code: 'TENANT_REQUIRED',
            message: 'tenantId is required'
          }
        });
      }
      if (!isSafeId(tenantId) || !isSafeId(deviceId)) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_TENANT_OR_DEVICE_ID',
            message: 'tenantId or deviceId is invalid'
          }
        });
      }
      const qr = options.devices.getQr(deviceId, tenantId);

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
      const { tenantId } = (request.query ?? {}) as { tenantId?: string };
      if (!tenantId) {
        return reply.code(400).send({
          error: {
            code: 'TENANT_REQUIRED',
            message: 'tenantId is required'
          }
        });
      }
      if (!isSafeId(tenantId) || !isSafeId(deviceId)) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_TENANT_OR_DEVICE_ID',
            message: 'tenantId or deviceId is invalid'
          }
        });
      }
      const qr = options.devices.getQr(deviceId, tenantId);

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

      if (!body.tenantId || !body.to || !body.text) {
        return reply.code(400).send({
          success: false,
          requestId: body.requestId,
          error: {
            code: 'INVALID_REQUEST',
            message: 'tenantId, to, and text are required'
          }
        });
      }
      if (!isSafeId(body.tenantId) || (body.deviceId && !isSafeId(body.deviceId))) {
        return reply.code(400).send({
          success: false,
          requestId: body.requestId,
          error: {
            code: 'INVALID_TENANT_OR_DEVICE_ID',
            message: 'tenantId or deviceId is invalid'
          }
        });
      }

      const requestId = body.requestId?.trim() || randomUUID();
      if (requestId.length > 128) {
        return reply.code(400).send({
          success: false,
          requestId,
          error: {
            code: 'INVALID_REQUEST_ID',
            message: 'requestId is too long'
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

        await recordDeliveryLogSafe({
          requestId,
          tenantId: result.tenantId,
          deviceId: result.deviceId,
          messageType: 'TEXT',
          destination: body.to,
          providerMessageId: result.providerMessageId,
          result: 'SENT'
        });

        return reply.code(200).send({
          success: true,
          tenantId: result.tenantId,
          deviceId: result.deviceId,
          to: result.to,
          providerMessageId: result.providerMessageId,
          requestId
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
                : code === 'DEVICE_REQUIRED' || code === 'INVALID_PHONE' || code === 'INVALID_TEXT'
                  ? 400
                  : 502;
        const safeMessage = 'Unable to send WhatsApp text message';

        await recordDeliveryLogSafe({
          requestId,
          tenantId: body.tenantId,
          deviceId: body.deviceId,
          messageType: 'TEXT',
          destination: body.to,
          result: 'FAILED',
          errorCode: code,
          errorMessage: safeMessage
        });

        return reply.code(statusCode).send({
          success: false,
          requestId,
          error: {
            code,
            message: safeMessage
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
        documentBase64?: string;
        mimeType?: string;
        filename?: string;
        caption?: string;
        requestId?: string;
      };

      const hasUrl = Boolean(body.documentUrl?.trim());
      const hasInline = Boolean(body.documentBase64?.trim());
      if (
        !body.tenantId ||
        !body.to ||
        !body.filename ||
        hasUrl === hasInline
      ) {
        return reply.code(400).send({
          success: false,
          requestId: body.requestId,
          error: {
            code: 'INVALID_REQUEST',
            message:
              'tenantId, to, filename, and exactly one document source are required'
          }
        });
      }
      if (!isSafeId(body.tenantId) || (body.deviceId && !isSafeId(body.deviceId))) {
        return reply.code(400).send({
          success: false,
          requestId: body.requestId,
          error: {
            code: 'INVALID_TENANT_OR_DEVICE_ID',
            message: 'tenantId or deviceId is invalid'
          }
        });
      }

      const requestId = body.requestId?.trim() || randomUUID();
      if (requestId.length > 128) {
        return reply.code(400).send({
          success: false,
          requestId,
          error: {
            code: 'INVALID_REQUEST_ID',
            message: 'requestId is too long'
          }
        });
      }

      try {
        if (body.deviceId) {
          const device = options.devices.status(body.deviceId, body.tenantId);
          if (!device) {
            const sameDeviceOtherTenant = options.devices
              .list()
              .some(
                (candidate) =>
                  candidate.deviceId === body.deviceId && candidate.tenantId !== body.tenantId
              );
            if (sameDeviceOtherTenant) throw new Error('DEVICE_TENANT_MISMATCH');
            throw new Error('DEVICE_NOT_FOUND');
          }
          if (device.status !== 'CONNECTED') throw new Error('DEVICE_NOT_CONNECTED');
        } else {
          const tenantDevices = options.devices.list(body.tenantId);
          if (tenantDevices.length === 0) throw new Error('DEVICE_NOT_FOUND');
          if (tenantDevices.length > 1) throw new Error('DEVICE_REQUIRED');
          if (tenantDevices[0]?.status !== 'CONNECTED') throw new Error('DEVICE_NOT_CONNECTED');
        }

        let document: Buffer;
        let mimeType: 'application/pdf' | 'image/png';
        if (hasInline) {
          const inline = decodeInlineDocument(
            body.documentBase64!,
            body.mimeType
          );
          document = inline.document;
          mimeType = inline.mimeType;
        } else {
          document = await fetchPdfWithPolicy(
            body.documentUrl!,
            documentUrlPolicy,
            MAX_PDF_BYTES
          );
          mimeType = 'application/pdf';
        }

        const filename = sanitizeDocumentFilename(body.filename, mimeType);
        const caption = body.caption?.trim();
        if (caption && caption.length > 1024) throw new Error('INVALID_DOCUMENT_CAPTION');

        const result = await options.devices.sendDocument({
          tenantId: body.tenantId,
          deviceId: body.deviceId,
          to: body.to,
          document,
          filename,
          mimeType,
          caption: caption || undefined
        });

        await recordDeliveryLogSafe({
          requestId,
          tenantId: result.tenantId,
          deviceId: result.deviceId,
          messageType: 'DOCUMENT',
          destination: body.to,
          providerMessageId: result.providerMessageId,
          result: 'SENT'
        });

        return reply.code(200).send({
          success: true,
          tenantId: result.tenantId,
          deviceId: result.deviceId,
          to: result.to,
          filename,
          providerMessageId: result.providerMessageId,
          requestId
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
                : code === 'DEVICE_REQUIRED'
                  ? 400
                  : code === 'DOCUMENT_TOO_LARGE'
                    ? 413
                    : code === 'INVALID_PHONE' ||
                        code === 'INVALID_DOCUMENT_SOURCE' ||
                        code === 'INVALID_DOCUMENT_FILENAME' ||
                        code === 'INVALID_DOCUMENT_CAPTION' ||
                        code === 'INVALID_DOCUMENT_BASE64' ||
                        code === 'UNSUPPORTED_DOCUMENT_TYPE'
                      ? 400
                      : 502;
        const safeMessage = 'Unable to send WhatsApp document';

        await recordDeliveryLogSafe({
          requestId,
          tenantId: body.tenantId,
          deviceId: body.deviceId,
          messageType: 'DOCUMENT',
          destination: body.to,
          result: 'FAILED',
          errorCode: code,
          errorMessage: safeMessage
        });

        return reply.code(statusCode).send({
          success: false,
          requestId,
          error: {
            code,
            message: safeMessage
          }
        });
      }
    }
  );

  return app;
}
