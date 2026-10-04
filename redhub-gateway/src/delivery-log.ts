export type DeliveryMessageType = 'TEXT' | 'DOCUMENT';
export type DeliveryResult = 'SENT' | 'FAILED';

export type DeliveryLogDatabase = {
  query: (sql: string, params?: unknown[]) => Promise<unknown>;
};

export type DeliveryLogInput = {
  requestId: string;
  tenantId: string;
  deviceId?: string;
  messageType: DeliveryMessageType;
  destination: string;
  providerMessageId?: string;
  result: DeliveryResult;
  errorCode?: string;
  errorMessage?: string;
};

export function maskDestination(value: string): string {
  const normalized = value.replace(/\D/g, '');
  if (!normalized) return '***';
  if (normalized.length <= 6) return '*'.repeat(normalized.length);

  const prefix = normalized.slice(0, 4);
  const suffix = normalized.slice(-3);
  return `${prefix}${'*'.repeat(Math.max(4, normalized.length - 7))}${suffix}`;
}

export async function insertDeliveryLog(
  db: DeliveryLogDatabase,
  input: DeliveryLogInput
): Promise<void> {
  await db.query(
    `INSERT INTO delivery_logs (
      request_id,
      tenant_id,
      device_id,
      message_type,
      destination_masked,
      provider_message_id,
      result,
      error_code,
      error_message
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      input.requestId,
      input.tenantId,
      input.deviceId ?? null,
      input.messageType,
      maskDestination(input.destination),
      input.providerMessageId ?? null,
      input.result,
      input.errorCode ?? null,
      input.errorMessage ?? null
    ]
  );
}
