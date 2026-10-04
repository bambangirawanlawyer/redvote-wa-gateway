const baseUrl = (process.env.WA_GATEWAY_BASE_URL ?? 'http://127.0.0.1:3410').replace(/\/$/, '');
const token = process.env.API_TOKEN_SECRET ?? process.env.WA_GATEWAY_TOKEN;
const tenantId = process.env.WA_GATEWAY_TENANT_ID ?? process.env.DEFAULT_TENANT_ID;
const deviceId = process.env.WA_GATEWAY_DEVICE_ID ?? process.env.DEFAULT_DEVICE_ID;

if (!token || !tenantId || !deviceId) {
  console.error('Missing token/tenant/device environment for contract smoke');
  process.exit(2);
}

const auth = { Authorization: `Bearer ${token}` };
const jsonHeaders = { ...auth, 'Content-Type': 'application/json' };

async function parse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const health = await fetch(`${baseUrl}/health`);
  assert(health.status === 200, `health expected 200, got ${health.status}`);
  console.log('HEALTH=PASS');

  const list = await fetch(
    `${baseUrl}/api/v1/devices?tenantId=${encodeURIComponent(tenantId)}`,
    { headers: auth }
  );
  const listBody = await parse(list);
  assert(list.status === 200, `device list expected 200, got ${list.status}`);
  assert(
    Array.isArray(listBody.devices) &&
      listBody.devices.some(
        (device) => device.tenantId === tenantId && device.deviceId === deviceId
      ),
    'tenant/device mapping not present'
  );
  console.log('TENANT_MAPPING=PASS');

  const status = await fetch(
    `${baseUrl}/api/v1/devices/${encodeURIComponent(deviceId)}/status?tenantId=${encodeURIComponent(tenantId)}`,
    { headers: auth }
  );
  const statusBody = await parse(status);
  assert(status.status === 200, `device status expected 200, got ${status.status}`);
  assert(statusBody.status === 'CONNECTED', `device not CONNECTED: ${statusBody.status}`);
  console.log('DEVICE_STATUS=PASS');

  const unauthorized = await fetch(
    `${baseUrl}/api/v1/devices?tenantId=${encodeURIComponent(tenantId)}`
  );
  const unauthorizedBody = await parse(unauthorized);
  assert(
    unauthorized.status === 401 && unauthorizedBody.error?.code === 'UNAUTHORIZED',
    'unauthorized contract mismatch'
  );
  console.log('AUTH_CONTRACT=PASS');

  const textRequestId = 'wa008-contract-text-error';
  const textResponse = await fetch(`${baseUrl}/api/v1/messages/text`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      tenantId,
      deviceId,
      to: 'invalid',
      text: 'WA-008 contract validation only',
      requestId: textRequestId
    })
  });
  const textBody = await parse(textResponse);
  assert(textResponse.status === 400, `text error expected 400, got ${textResponse.status}`);
  assert(textBody.error?.code === 'INVALID_PHONE', 'text error code mismatch');
  assert(textBody.requestId === textRequestId, 'text requestId not preserved');
  console.log('TEXT_CONTRACT=PASS');

  const documentRequestId = 'wa008-contract-document-error';
  const documentResponse = await fetch(`${baseUrl}/api/v1/messages/document`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      tenantId,
      deviceId,
      to: 'invalid',
      documentUrl: 'file:///blocked-contract-test.pdf',
      filename: 'contract-test.pdf',
      caption: 'WA-008 contract validation only',
      requestId: documentRequestId
    })
  });
  const documentBody = await parse(documentResponse);
  assert(
    documentResponse.status === 400,
    `document error expected 400, got ${documentResponse.status}`
  );
  assert(
    documentBody.error?.code === 'INVALID_DOCUMENT_SOURCE',
    'document error code mismatch'
  );
  assert(documentBody.requestId === documentRequestId, 'document requestId not preserved');
  console.log('DOCUMENT_CONTRACT=PASS');

  console.log('CONTRACT_SMOKE=PASS');
  console.log('WHATSAPP_MESSAGES_SENT=0');
}

main().catch((error) => {
  console.error('CONTRACT_SMOKE=FAIL');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
