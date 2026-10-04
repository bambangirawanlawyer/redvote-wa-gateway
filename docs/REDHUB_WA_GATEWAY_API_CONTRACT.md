# REDHUB WA Gateway — API Contract V1

> Revised **2026-10-05** through **WA-005 PASS / LOCKED**.
> Gateway is a simple multi-tenant WhatsApp delivery layer. Broadcast, reminder H-1, scheduling, recipient selection, and business retry remain in the RedHub backend.

Base path:
`/api/v1`

## 1. Authentication

`GET /health` is unauthenticated on the internal/local network.

All `/api/v1/*` endpoints require:

```http
Authorization: Bearer <internal-api-token>
Content-Type: application/json
```

Secrets, session credentials, and provider key material must never appear in Git, API responses, or normal logs.

## 2. Tenant and Device Identity

Every device and send operation belongs to a tenant.

Rules:
- `tenantId` is mandatory for tenant-scoped device operations;
- runtime identity is the pair `tenantId + deviceId`;
- the same `deviceId` may exist under different tenants;
- tenant A must not access tenant B device/session;
- session path is `SESSION_DIR/<tenantId>/<deviceId>/`;
- persisted tenant sessions are restored on gateway startup;
- default tenant/device values come from environment, not a Jember hard-code.

### Implicit default device

For text/document delivery:
- if a tenant has exactly one runtime device, `deviceId` may be omitted and that device is used as the implicit default;
- if a tenant has more than one device and `deviceId` is omitted, gateway returns `DEVICE_REQUIRED`;
- if an explicit device belongs to another tenant, gateway returns `DEVICE_TENANT_MISMATCH`.

## 3. GET /health

Example response:

```json
{
  "status": "ok",
  "service": "redhub-wa-gateway",
  "version": "0.1.0",
  "database": "ok"
}
```

## 4. Device / Session API

### Start or pair a device

`POST /api/v1/devices/:deviceId/pair`

Request:

```json
{
  "tenantId": "jember"
}
```

The endpoint starts the tenant-scoped device. If credentials do not yet represent a linked account, status progresses to `PAIRING` and QR becomes available.

### List devices for one tenant

`GET /api/v1/devices?tenantId=<tenantId>`

Example response:

```json
{
  "tenantId": "jember",
  "devices": [
    {
      "deviceId": "jember-main",
      "tenantId": "jember",
      "provider": "baileys",
      "status": "CONNECTED",
      "hasQr": false
    }
  ]
}
```

### Device status

`GET /api/v1/devices/:deviceId/status?tenantId=<tenantId>`

### Pairing state as JSON

`GET /api/v1/devices/:deviceId/pairing?tenantId=<tenantId>`

### Pairing QR as PNG

`GET /api/v1/devices/:deviceId/pairing.png?tenantId=<tenantId>`

Baseline device status:
- `DISCONNECTED`
- `CONNECTING`
- `PAIRING`
- `CONNECTED`
- `ERROR`

QR rules:
- bearer-auth protected;
- tenant-scoped;
- short-lived;
- not written to normal logs;
- returns unavailable when no active QR exists.

A logout/delete-session API is **not part of the implemented WA-005 contract yet**.

## 5. POST /api/v1/messages/text

Purpose: send one ready-to-deliver text message supplied by RedHub backend.

Request with explicit device:

```json
{
  "tenantId": "jember",
  "deviceId": "jember-main",
  "to": "628123456789",
  "text": "Undangan rapat...",
  "requestId": "rh-req-001"
}
```

For a tenant with exactly one device, `deviceId` may be omitted.

Validation:
- authenticated request;
- tenant/device ownership;
- connected device;
- destination normalization/validation;
- non-empty text;
- text length limit.

Success:

```json
{
  "success": true,
  "tenantId": "jember",
  "deviceId": "jember-main",
  "to": "628123456789",
  "providerMessageId": "provider-message-id",
  "requestId": "rh-req-001"
}
```

Failure example:

```json
{
  "success": false,
  "requestId": "rh-req-001",
  "error": {
    "code": "DEVICE_NOT_CONNECTED",
    "message": "Unable to send WhatsApp text message"
  }
}
```

Raw provider stack/credential must not be returned.

## 6. POST /api/v1/messages/document

Purpose: send one PDF document determined by RedHub backend.

Request:

```json
{
  "tenantId": "jember",
  "deviceId": "jember-main",
  "to": "628123456789",
  "documentUrl": "https://redhub.example/files/undangan.pdf",
  "filename": "Undangan_Rapat.pdf",
  "caption": "Undangan resmi terlampir.",
  "requestId": "rh-req-002"
}
```

For a tenant with exactly one device, `deviceId` may be omitted.

Gateway behavior:
1. validate tenant/device ownership before document fetch when an explicit device is supplied;
2. reject URL credentials and malformed/oversized source URLs;
3. require HTTPS for non-allowlisted/public sources;
4. allow internal/private HTTP only for an exact hostname configured in `DOCUMENT_ALLOWED_HOSTS`;
5. reject localhost/private/reserved address targets for non-allowlisted sources, including DNS-resolved targets;
6. process redirects manually and revalidate every redirect target, with a bounded redirect count;
7. fetch as a streamed response;
8. require `application/pdf`;
9. reject over 10 MB, including early cancellation when stream exceeds the limit;
10. verify PDF magic `%PDF-`;
11. sanitize filename and add `.pdf` when necessary;
12. validate optional caption length;
13. keep the PDF in memory only;
14. send as WhatsApp document with `application/pdf`;
15. return provider result.

The gateway is not a permanent document archive.

Success:

```json
{
  "success": true,
  "tenantId": "jember",
  "deviceId": "jember-main",
  "to": "628123456789",
  "filename": "Undangan_Rapat.pdf",
  "providerMessageId": "provider-message-id",
  "requestId": "rh-req-002"
}
```

## 7. Session Persistence

Current storage:

```text
SESSION_DIR/
  tenant-a/
    device-main/
      creds.json
      ...
  tenant-b/
    device-main/
      creds.json
      ...
```

Rules:
- session credentials live in persistent Docker storage;
- session credentials never enter Git;
- session root/tenant/device directories use mode `700`;
- session credential/key files use mode `600`;
- gateway process runs as non-root application user;
- WA-005 migrates the previous legacy single-level session path into the tenant/device layout;
- persisted tenant sessions are discovered and started during gateway startup;
- a valid paired session must reconnect without a new QR after container restart.

## 8. Correlation and Delivery Logging

**WA-006: PASS / LOCKED.**

`requestId` is the correlation ID returned by delivery endpoints:
- RedHub-supplied requestId is preserved;
- if omitted, gateway generates a UUID;
- maximum length is 128 characters.

Operational audit is persisted to PostgreSQL `delivery_logs` with:
- requestId;
- tenantId;
- deviceId;
- type `TEXT` / `DOCUMENT`;
- **masked destination only**;
- providerMessageId on successful delivery;
- result `SENT` / `FAILED`;
- safe error code/message;
- database timestamp.

The audit schema does not store a raw phone/destination column.

Audit persistence is failure-isolated: if the WhatsApp send succeeds but the audit INSERT fails, the delivery response remains successful and the gateway emits only a safe application error log. This avoids accidental RedHub re-send caused solely by audit failure.

No campaign queue/scheduler is added by WA-006.

## 9. Error Codes Baseline

Implemented/currently expected:
- `UNAUTHORIZED`
- `TENANT_REQUIRED`
- `DEVICE_NOT_FOUND`
- `DEVICE_TENANT_MISMATCH`
- `DEVICE_REQUIRED`
- `DEVICE_NOT_CONNECTED`
- `INVALID_PHONE`
- `INVALID_TEXT`
- `INVALID_REQUEST`
- `INVALID_REQUEST_ID`
- `INVALID_DOCUMENT_SOURCE`
- `INVALID_DOCUMENT_FILENAME`
- `INVALID_DOCUMENT_CAPTION`
- `DOCUMENT_TOO_LARGE`
- `UNSUPPORTED_DOCUMENT_TYPE`
- `PROVIDER_ERROR`

Provider internals and stack traces must not be returned to clients.

## 10. Explicit Non-Scope

Gateway V1 does not own:
- campaign creation;
- broadcast scheduling;
- H-1 scheduling;
- recipient segmentation;
- meeting/business template rendering;
- campaign retry worker;
- business idempotency/duplicate policy;
- CRM/chatbot/inbox.

Responsibility remains:

```text
RedHub Backend
  decides tenant / recipient / schedule / H-1 timing / text / PDF URL
        |
        v
WA Gateway
  resolves tenant session -> sends -> returns provider result
        |
        v
WhatsApp
```

## 11. Breaking Changes

Any breaking API change must:
1. be recorded in Decisions;
2. update this contract;
3. update Checkpoints;
4. include a RedHub client migration plan;
5. never be introduced silently.
