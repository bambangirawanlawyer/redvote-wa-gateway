# REDHUB WA Gateway — Master Handoff

> Active source of truth untuk project **RedHub WA Gateway**.
> Scope diperbarui pada **2026-10-05** berdasarkan keputusan eksplisit user: broadcast dan reminder H-1 sudah berada di backend RedHub; gateway harus tetap sederhana sebagai delivery layer multi-tenant.

## 1. Tujuan

Membangun WhatsApp Gateway mandiri untuk RedHub agar jalur pengiriman tidak bergantung pada Fonnte.

Gateway bukan business engine. Backend RedHub tetap menjadi otak sistem.

### Backend RedHub bertanggung jawab atas
- broadcast orchestration;
- reminder H-1;
- jadwal;
- pemilihan/segmentasi penerima;
- meeting/event data;
- business template/context;
- keputusan retry bisnis dan re-send;
- duplicate/business rules.

### WA Gateway bertanggung jawab atas
- internal authenticated API;
- tenant/device resolution;
- WhatsApp session lifecycle;
- persistent session;
- reconnect;
- send text;
- send PDF/document;
- provider response/message ID/error;
- minimal delivery logging/audit;
- tenant isolation.

## 2. Arsitektur

```text
RedHub Backend
      |
      | authenticated internal REST
      v
RedHub WA Gateway
  |-- Tenant/Device Resolver
  |-- WhatsApp Provider Adapter
  |     `-- Baileys V1
  |-- Persistent Session Store
  |-- Text Sender
  |-- Document/PDF Sender
  `-- Minimal Delivery Log
      |
      v
   WhatsApp
```

No campaign scheduler atau reminder scheduler di gateway.

## 3. Prinsip Kerja

1. GitHub adalah source of truth.
2. Setiap tahap wajib punya checkpoint.
3. PASS hanya setelah acceptance criteria diuji.
4. PASS yang stabil diberi status PASS / LOCKED.
5. Development dilakukan **local-first** menggunakan Docker Compose.
6. VPS baru hanya menerima build yang sudah lolos local gate.
7. VPS target: **202.10.36.74**.
8. VPS lama **202.10.45.147** tidak disentuh tanpa instruksi eksplisit.
9. Secret/session/token/password tidak boleh masuk Git.
10. Multi-tenant isolation wajib sejak awal.
11. Jangan menambah kompleksitas yang sudah dimiliki backend RedHub.

## 4. Stack V1

- Node.js 22
- TypeScript
- Fastify
- Baileys `7.0.0-rc14` pada checkpoint session saat ini
- Docker / Docker Compose
- PostgreSQL yang sudah ada pada foundation tetap dipertahankan untuk metadata/log minimum; **bukan campaign queue/scheduler**
- persistent Docker volume untuk WhatsApp session

Tidak diperlukan:
- Redis
- RabbitMQ
- Kubernetes
- Puppeteer/Chromium
- campaign worker
- reminder worker

## 5. Multi-Tenant

Baseline:
```text
Tenant Jember      -> WA Device/Session Jember
Tenant Banyuwangi  -> WA Device/Session Banyuwangi
Tenant Bondowoso   -> WA Device/Session Bondowoso
```

Rules:
- request selalu terkait tenant;
- device/session punya ownership tenant;
- session path: `SESSION_DIR/<tenantId>/<deviceId>/`;
- satu-device tenant menjadi implicit default bila `deviceId` tidak dikirim;
- bila tenant memiliki >1 device, `deviceId` wajib eksplisit;
- device ID yang sama boleh ada pada tenant berbeda;
- persisted tenant sessions dipulihkan saat startup;
- tenant A dilarang memakai session tenant B;
- tenant/device default berasal dari environment, bukan hard-code core;
- organization/business logic tidak ditanam ke gateway.

## 6. API Capability Baseline

Minimal:
- `GET /health`
- create/list/status/connect/logout session/device tenant
- protected QR/pairing endpoint
- `POST /api/v1/messages/text`
- `POST /api/v1/messages/document`

Gateway menerima payload delivery siap kirim dari backend RedHub.

Contoh text:
```json
{
  "tenantId": "jember",
  "to": "628123456789",
  "text": "Undangan rapat..."
}
```

Contoh PDF:
```json
{
  "tenantId": "jember",
  "to": "628123456789",
  "documentUrl": "https://redhub.example/undangan.pdf",
  "filename": "Undangan_Rapat.pdf",
  "caption": "Undangan resmi terlampir."
}
```

## 7. PDF Rules

- PDF dikirim sebagai WhatsApp document attachment.
- Gateway boleh mengambil file dari URL yang diberikan backend.
- File hanya temporary; bukan document archive.
- filename disanitasi.
- type/size divalidasi.
- temporary file/buffer dibersihkan.

## 8. Security

- internal bearer authentication;
- API token minimal 32 karakter dan bukan placeholder;
- tidak ada anonymous send endpoint;
- validate tenant/device ID dan ownership;
- validate phone;
- validate document source;
- public document URL wajib HTTPS secara default;
- private/internal HTTP hanya melalui exact host allowlist `DOCUMENT_ALLOWED_HOSTS`;
- redirect document URL selalu divalidasi ulang;
- limit ukuran document 10 MiB;
- request body dibatasi;
- no secret/session in Git/log;
- Authorization header di-redact;
- session directory `700`, credential/key files `600`;
- container gateway berjalan non-root;
- host port gateway tetap loopback-only sampai deployment architecture menyatakan lain.

## 9. Local-First Strategy

Local gate wajib sebelum VPS:
- Docker build/start;
- health/DB;
- real pairing;
- CONNECTED;
- persistent session after restart;
- reconnect;
- one real text message;
- one real PDF/document;
- tenant isolation;
- unauthorized request rejected;
- log hygiene.

## 10. Production VPS

Target:
- IP: `202.10.36.74`
- Ubuntu 24.04 LTS
- 2 vCPU
- ~3.8 GiB RAM
- 80 GB disk

Production work baru dimulai setelah local functional gate PASS.

## 11. Checkpoint Plan

### WA-000 — Historical Architecture & Contract
**PASS / LOCKED**
Baseline awal sebelum scope simplification.

### WA-001 — Local Docker Foundation
**PASS / LOCKED**
Node/Fastify/Docker/PostgreSQL/health foundation sudah tervalidasi.

### WA-001A — Scope Simplification / Delivery-Layer Lock
**PASS / LOCKED — 2026-10-05**
Explicit scope revision:
- broadcast/reminder/scheduling tetap di RedHub backend;
- gateway hanya delivery layer multi-tenant;
- queue/campaign/retry business engine di gateway dibatalkan dari V1.

### WA-002 — WhatsApp Device & Persistent Session
**PASS / LOCKED**
Real pairing, persistent session, restart/reconnect, and log hygiene verified.

### WA-003 — Text Delivery API
**PASS / LOCKED**
Real text delivery and provider result/error contract verified.

### WA-004 — PDF/Document Delivery API
**PASS / LOCKED**
Real PDF document delivery, filename/caption, source guards, and cleanup verified.

### WA-005 — Multi-Tenant Isolation
**PASS / LOCKED**
Tenant-scoped runtime registry/session paths, legacy session migration, implicit single-device default, future multi-device semantics, and cross-tenant rejection verified.

### WA-006 — Minimal Delivery Log & Error Contract
**PASS / LOCKED**
Correlation/request ID, masked destination audit, provider ID, SENT/FAILED, safe error, timestamp, and audit failure isolation verified.

### WA-007 — Security Gate
**PASS / LOCKED**
Bearer auth, payload validation, tenant ownership, document SSRF protection, PDF limits, filename sanitation, strong runtime secrets, session permissions, non-root execution, loopback exposure, Git secret/session review, and log hygiene verified.

### WA-008 — Actual RedHub Backend Integration Validation
**PASS / LOCKED — 2026-10-05**

The previous backend-access blocker is resolved.

Verified:
- actual production backend runtime identified as `redhub-hybrid.service`;
- recovered private source repository: `bambangirawanlawyer/redhub-backend`;
- backend integration branch: `feat/redhub-wa-gateway-provider`;
- RedHub business logic remains in the backend; gateway remains delivery-only;
- Jember mapping: `jember` / `jember-main`;
- backend adapter -> gateway connection: PASS / CONNECTED;
- backend -> gateway TEXT: SENT;
- backend -> gateway PDF: SENT;
- authenticated `broadcastMeetingInvitation` TEST business flow -> gateway -> WhatsApp: PASS;
- Firestore and gateway delivery audit both recorded the gateway delivery as SENT;
- user visually confirmed the business-flow invitation/PDF arrived;
- Fonnte credential remains available as rollback;
- production remains in TEST mode until WA-010.

### WA-009 - VPS Deployment
**PASS / LOCKED - 2026-10-05**

Production state:
- deployed on `202.10.36.74` from verified WA-009 branch/commit;
- Docker + Compose active;
- gateway healthy on loopback-only `127.0.0.1:3410`;
- PostgreSQL healthy with no published host port;
- production WhatsApp session `jember/jember-main` is CONNECTED;
- session survives gateway container restart without QR;
- production backup + non-destructive verification PASS;
- controlled production text and PDF API sends returned HTTP 200/provider IDs and delivery logs SENT;
- sensitive-log scan and session permission checks PASS;
- existing Nginx and `redhub-hybrid.service` remain active;
- old VPS `202.10.45.147` was not touched.

Final production acceptance:
- user confirmed both controlled production text and PDF were visibly received;
- full VPS reboot completed and all required services recovered automatically;
- WhatsApp returned CONNECTED without re-pairing;
- gateway remained healthy and loopback-only;
- delivery logs persisted;
- isolated session and PostgreSQL restore tests both PASS;
- existing Nginx and `redhub-hybrid.service` remained healthy;
- deployment evidence commit: `37d1356`.

### WA-010 - Production End-to-End
**PASS / LOCKED — 2026-10-05**

Production end-to-end gate completed:
- H-1 reminder was triggered by the RedHub backend reminder worker and delivered through the gateway;
- Firestore recorded the UAT reminder as `SENT` using `REDHUB_GATEWAY`;
- gateway audit recorded the matching `TEXT / SENT` result for `jember / jember-main`;
- cross-tenant adapter lookup safely returned `DEVICE_NOT_FOUND`;
- gateway restart recovered from `CONNECTING` to `CONNECTED` automatically without re-pairing;
- Fonnte credential remains available as rollback;
- Jember was switched from `TEST` to `LIVE` only after all previous gates passed;
- first controlled LIVE send returned `sent=1 / failed=0` and was recorded as `TEXT / SENT`;
- pre-existing scheduled reminders remain explicitly stored as `TEST`.

WA Gateway V1 is complete and operational in LIVE mode.

### WA-011 - RedHub Device Management & Pairing Integration
**PASS / LOCKED — 2026-10-06**

RedHub can now manage multiple WhatsApp sender devices without terminal/VPS access.

Completed:
- authoritative Flutter source recovered and verified against production;
- device list/status UI deployed;
- QR pairing flow deployed;
- pairing can be resumed with `Tampilkan QR`;
- default-device action exposed;
- sender selector added to Undangan & Broadcast;
- selected device is forwarded as `gatewayDeviceId` and preserved for H-1 reminder routing;
- gateway token remains server-side only;
- `jember-main` (`6285702459733`) = CONNECTED;
- `jember-02` (`6285806700300`) = CONNECTED;
- controlled send through `jember-02` returned `sent=1 / failed=0`;
- gateway audit recorded `jember-02` TEXT and DOCUMENT as SENT;
- UI-018 = PASS / LOCKED;
- active frontend release: `/var/www/redhub.redvote.id/releases/20261006-010820`;
- active backend release: `/opt/redhub-hybrid/releases/20261006-003054`.

The organization currently remains in TEST mode and no default device was forced automatically. The operator can choose either CONNECTED device using `Jadikan Default`.

## 12. Current Position

**WA-008:** PASS / LOCKED — actual RedHub backend recovered and integrated
**WA-009:** PASS / LOCKED — production gateway deployment
**WA-010:** PASS / LOCKED — production end-to-end and controlled go-live
**WA-011:** PASS / LOCKED — device management + pairing + sender selection complete
**RB-004:** PASS / LOCKED — production multi-device management API
**UI-018:** PASS / LOCKED — production multi-device frontend
**WA GATEWAY V1:** COMPLETE / LIVE
**PRODUCTION PROVIDER:** REDHUB_GATEWAY
**BROADCAST MODE:** TEST (current organization setting)
**TENANT:** jember
**DEVICES:** jember-main + jember-02, both CONNECTED
**DEFAULT DEVICE:** jember-main (`6285702459733`)
**ROLLBACK:** Fonnte credential retained
**PRODUCTION:** backend, reminder timer, gateway, PostgreSQL healthy; two WhatsApp devices CONNECTED
**TARGET VPS:** 202.10.36.74

## 13. Handoff Rule

Saat chat baru:
1. baca START HERE;
2. baca Master Handoff;
3. baca Checkpoints;
4. baca `docs/NEXT_SESSION_PR.md`;
5. baca Decisions;
6. baca API Contract;
7. cek branch/HEAD;
8. anggap WA-000 sampai WA-011 PASS / LOCKED kecuali ada regression terverifikasi;
9. anggap RB-004 dan UI-018 PASS / LOCKED;
10. source Flutter authoritative adalah repository `santrinasionalisid-stack/organisasi-attendance`, branch kerja UI-018 tercatat di GitHub;
11. jangan edit compiled `main.dart.js` untuk menggantikan source Flutter;
12. future capability harus memakai checkpoint baru;
13. jangan mengulang PASS/LOCKED tanpa regression.


## Post-Lock Integration Rule — UI-019 / RB-005 — 2026-10-06

**LOCKED**

RedHub organization identity is the canonical WA Gateway tenant identity:

- one RedHub organization = one WA Gateway tenant;
- `organizationId` = `gatewayTenantId`;
- do not add a separate gateway tenant-creation lifecycle or tenant registry UI;
- organization creation/mapping is owned by RedHub backend;
- WA Gateway creates/manages device sessions under the supplied tenant ID only;
- one organization/tenant may have multiple devices;
- default sender and per-broadcast sender selection remain organization-scoped;
- UI-019 and RB-005 are PASS / LOCKED.

## WA-012 — Secure Inline QR Document Extension — 2026-10-07

**PASS / LOCKED at source/local gate; production deploy pending.**

RedHub QR credentials must not be exposed through a permanent public file URL. The gateway document endpoint is therefore extended additively:
- existing PDF `documentUrl` remains unchanged;
- confidential QR may use bounded inline `documentBase64` with `mimeType=image/png`;
- decoded PNG max 32 KiB;
- Fastify body limit remains 64 KiB;
- PNG signature required;
- payload is sent in-memory to Baileys;
- no public QR file is created.

Local verification: 32/32 tests PASS, typecheck PASS, build PASS.

## Production State — WA-012 — 2026-10-07

WA-012 secure inline PNG document delivery is now **deployed and locked in production**.

Production source:
`2dbdb838ba5495ba9cb90dc04669e5ad8b3c0a15`

Verified:
- gateway healthy;
- PostgreSQL healthy;
- 2/2 WhatsApp devices CONNECTED;
- 0 devices require QR pairing;
- device identities and phone bindings survived container rebuild;
- inline-PNG contract smoke PASS without sending a WhatsApp message;
- existing PDF URL contract remains available;
- rollback baseline and production backups are recorded in `REDHUB_WA_GATEWAY_CHECKPOINTS.md`.

Do not remove or relax:
- 64 KiB global Fastify body limit;
- 32 KiB decoded inline PNG limit;
- PNG signature validation;
- bearer auth;
- tenant/device ownership validation;
- existing PDF SSRF protections.
