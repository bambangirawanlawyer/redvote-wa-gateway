# RedHub Backend -> WA Gateway Integration

## Purpose

Dokumen ini adalah contract handoff untuk backend RedHub.

WA Gateway hanya delivery layer. Backend RedHub tetap memiliki:
- broadcast orchestration;
- reminder H-1;
- recipient selection;
- meeting/event business logic;
- schedule;
- business retry/re-send decision.

Gateway hanya menerima satu delivery request yang sudah siap dikirim.

## Backend Environment

Recommended backend-side configuration:

```env
WA_GATEWAY_BASE_URL=http://127.0.0.1:3410
WA_GATEWAY_TOKEN=<strong internal bearer token>
WA_GATEWAY_TENANT_ID=<tenant id>
WA_GATEWAY_DEVICE_ID=<optional when tenant has exactly one device>
```

Jika RedHub dan gateway berada di host/VPS yang sama, akses loopback/private network lebih disukai daripada mengekspos gateway ke internet.

## Common Headers

```http
Authorization: Bearer <WA_GATEWAY_TOKEN>
Content-Type: application/json
```

`GET /health` adalah satu-satunya endpoint yang tidak memerlukan bearer token.

## Text Delivery

Endpoint:

```http
POST /api/v1/messages/text
```

Request:

```json
{
  "tenantId": "jember",
  "deviceId": "jember-main",
  "to": "628123456789",
  "text": "Pengingat rapat besok...",
  "requestId": "redhub-reminder-20261005-member-123"
}
```

Untuk tenant dengan tepat satu device, `deviceId` boleh dihilangkan.

Success:

```json
{
  "success": true,
  "tenantId": "jember",
  "deviceId": "jember-main",
  "to": "628123456789",
  "providerMessageId": "provider-id",
  "requestId": "redhub-reminder-20261005-member-123"
}
```

## PDF / Document Delivery

Endpoint:

```http
POST /api/v1/messages/document
```

Request:

```json
{
  "tenantId": "jember",
  "deviceId": "jember-main",
  "to": "628123456789",
  "documentUrl": "https://redhub.example/files/undangan.pdf",
  "filename": "Undangan_Rapat.pdf",
  "caption": "Undangan resmi terlampir.",
  "requestId": "redhub-invitation-20261005-member-123"
}
```

Document source rules:
- public source: HTTPS;
- private/internal HTTP: only when exact hostname is configured in gateway `DOCUMENT_ALLOWED_HOSTS`;
- maximum PDF size: 10 MiB;
- MIME and PDF signature are validated;
- redirect targets are security-validated again.

## Error Handling

Typical codes:
- `401 UNAUTHORIZED`: token missing/wrong;
- `403 DEVICE_TENANT_MISMATCH`: device belongs to another tenant;
- `404 DEVICE_NOT_FOUND`: tenant/device not available;
- `409 DEVICE_NOT_CONNECTED`: WhatsApp device offline;
- `400 INVALID_PHONE`: recipient invalid;
- `400 DEVICE_REQUIRED`: tenant has multiple devices and backend did not choose one;
- `400 INVALID_DOCUMENT_SOURCE`: unsafe/unreachable document source;
- `413 DOCUMENT_TOO_LARGE`: PDF exceeds limit;
- `502 PROVIDER_ERROR`: WhatsApp provider operation failed.

Backend should consume `error.code`, not raw provider stack text.

## Retry Ownership

Gateway does not own business retry.

Recommended backend behavior:
- validation/ownership errors: do not blind retry;
- disconnected/provider transient errors: backend decides retry policy;
- use a stable business/correlation `requestId` for traceability;
- gateway audit failure does not turn a successful WhatsApp send into failure.

## Reminder H-1

The reminder flow remains:

```text
RedHub Scheduler / Business Logic
  -> selects H-1 recipients
  -> builds text / PDF URL
  -> calls WA Gateway once per delivery
  -> consumes success/error
```

WA Gateway must not calculate H-1 and must not query RedHub meeting participants.

## Broadcast

The broadcast flow remains:

```text
RedHub Backend
  -> campaign / recipient loop / batching
  -> individual delivery request(s)
  -> WA Gateway
  -> WhatsApp
```

Gateway does not contain campaign tables, campaign scheduler, recipient segmentation, or broadcast business state.

## Local Contract Smoke

A non-sending smoke harness is provided:

```text
redhub-gateway/scripts/redhub-contract-smoke.mjs
```

Run from the gateway project with the local environment loaded:

```powershell
node --env-file=.env scripts/redhub-contract-smoke.mjs
```

The smoke harness verifies:
- health;
- authenticated tenant/device mapping;
- connected device status;
- unauthorized contract;
- text error response + requestId;
- document error response + requestId.

It intentionally uses invalid test input at the final delivery step and sends **zero WhatsApp messages**.

## WA-008 Exit Requirement

This harness validates the gateway side of the contract only.

WA-008 can be marked PASS / LOCKED only after the **actual RedHub backend** source/runtime is available and verified to:
1. call text delivery;
2. call PDF delivery;
3. pass the correct tenant mapping;
4. consume gateway success/error;
5. keep broadcast and H-1 reminder orchestration in RedHub.
