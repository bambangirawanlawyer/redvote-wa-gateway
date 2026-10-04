# REDHUB WA Gateway — API Contract V1

> Revised **2026-10-05**.
> Gateway adalah simple multi-tenant delivery layer. Broadcast, reminder H-1, scheduling, recipient selection, dan business retry berada di backend RedHub.

Base path:
`/api/v1`

## 1. Authentication

`GET /health` boleh unauthenticated pada internal network.

Endpoint lain wajib:
```http
Authorization: Bearer <internal-api-token>
Content-Type: application/json
```

Token/secret tidak pernah masuk Git atau response.

## 2. Tenant Rule

Semua session/send operation terikat tenant.

Pilot:
`jember`

Rules:
- device/session belongs to tenant;
- cross-tenant access rejected;
- satu default device per tenant baseline;
- future multi-device allowed.

## 3. GET /health

Example:
```json
{
  "status": "ok",
  "service": "redhub-wa-gateway",
  "version": "0.1.0"
}
```

Health tidak menampilkan secret/session credential.

## 4. Session / Device API

Implementation boleh mempertahankan device-centric route yang sudah dibangun pada WA-002 selama semantics berikut tersedia:

### Create/register logical device
`POST /api/v1/devices`

Example:
```json
{
  "tenantId": "jember",
  "name": "WhatsApp Utama Jember",
  "provider": "baileys",
  "isDefault": true
}
```

### Start pairing
`POST /api/v1/devices/:deviceId/pair`

### Pairing state
`GET /api/v1/devices/:deviceId/pairing`

### Device status
`GET /api/v1/devices/:deviceId/status`

### Logout/disconnect
`POST /api/v1/devices/:deviceId/logout`

Baseline status:
- `DISCONNECTED`
- `CONNECTING`
- `PAIRING`
- `CONNECTED`
- `ERROR`

QR:
- protected;
- short-lived;
- never emitted to normal logs;
- tenant ownership validated.

## 5. POST /api/v1/messages/text

Purpose:
mengirim satu pesan text yang sudah disiapkan oleh backend RedHub.

### Request
```json
{
  "tenantId": "jember",
  "deviceId": "dev_jember_main",
  "to": "628123456789",
  "text": "Undangan rapat...",
  "requestId": "rh-req-001"
}
```

`deviceId` boleh optional jika tenant mempunyai exactly one default device.

`requestId` adalah correlation ID untuk tracing. Gateway tidak mengambil alih business idempotency backend.

### Validation
- authenticated;
- tenant active/known;
- device belongs to tenant;
- device CONNECTED;
- phone normalized/valid;
- text non-empty;
- bounded payload size.

### Success
```json
{
  "success": true,
  "tenantId": "jember",
  "deviceId": "dev_jember_main",
  "providerMessageId": "provider-message-id",
  "requestId": "rh-req-001"
}
```

### Failure
```json
{
  "success": false,
  "requestId": "rh-req-001",
  "error": {
    "code": "DEVICE_NOT_CONNECTED",
    "message": "WhatsApp device is not connected"
  }
}
```

Raw provider stack/credential tidak dikirim ke client.

## 6. POST /api/v1/messages/document

Purpose:
mengirim satu PDF/document yang sudah ditentukan backend RedHub.

### Request
```json
{
  "tenantId": "jember",
  "deviceId": "dev_jember_main",
  "to": "628123456789",
  "documentUrl": "https://redhub.example/files/undangan.pdf",
  "filename": "Undangan_Rapat.pdf",
  "caption": "Undangan resmi terlampir.",
  "requestId": "rh-req-002"
}
```

### Gateway behavior
1. validate tenant/device/recipient;
2. fetch/read source safely;
3. enforce allowed content type and size;
4. sanitize filename;
5. send as WhatsApp document;
6. return provider result;
7. remove temporary data.

Gateway tidak menyimpan PDF sebagai permanent archive.

### Success
```json
{
  "success": true,
  "tenantId": "jember",
  "deviceId": "dev_jember_main",
  "providerMessageId": "provider-message-id",
  "requestId": "rh-req-002"
}
```

## 7. Optional Minimal Delivery Log

Gateway boleh menyimpan operational delivery record:
- requestId;
- tenantId;
- deviceId;
- masked destination;
- type TEXT/DOCUMENT;
- providerMessageId;
- result SENT/FAILED;
- safe error code;
- timestamp.

Tidak menyimpan campaign/meeting business state sebagai source of truth.

## 8. Error Codes Baseline

- `UNAUTHORIZED`
- `FORBIDDEN`
- `TENANT_NOT_FOUND`
- `DEVICE_NOT_FOUND`
- `DEVICE_NOT_CONNECTED`
- `INVALID_PHONE`
- `INVALID_TEXT`
- `INVALID_DOCUMENT_SOURCE`
- `DOCUMENT_TOO_LARGE`
- `UNSUPPORTED_DOCUMENT_TYPE`
- `PROVIDER_ERROR`
- `INTERNAL_ERROR`

## 9. Explicit Non-Contract / Non-Scope

Tidak ada requirement gateway V1 untuk:
- `POST /invitations` business endpoint;
- campaign creation;
- campaign queue summary;
- H-1 scheduler;
- participant selection;
- meeting template rendering;
- campaign retry worker;
- business idempotency engine.

Backend RedHub menangani hal tersebut lalu memanggil text/document delivery endpoint.

## 10. End-to-End Responsibility

```text
RedHub Backend
  decides:
    tenant
    recipient
    schedule
    H-1 timing
    text/caption
    PDF URL
  |
  v
WA Gateway
  resolves tenant WA session
  sends delivery
  returns provider result
  |
  v
WhatsApp
```

## 11. Breaking Changes

Perubahan breaking harus:
1. dicatat di DECISIONS;
2. update API contract;
3. update checkpoint;
4. memiliki client migration plan;
5. tidak dilakukan diam-diam.
