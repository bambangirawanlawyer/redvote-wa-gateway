# REDHUB WA Gateway — Checkpoints

> Source of truth checkpoint RedHub WA Gateway. Terpisah dari checkpoint REDVOTE lama.

## Status Convention

- **NEXT** — tahap berikut.
- **IN PROGRESS** — sedang dikerjakan.
- **PASS** — acceptance criteria telah diuji.
- **PASS / LOCKED** — lulus dan dikunci.
- **BLOCKED** — ada blocker nyata.
- **FAILED** — acceptance criteria gagal.
- **SUPERSEDED** — rencana lama digantikan oleh keputusan eksplisit yang lebih baru.

Setiap checkpoint yang PASS wajib mencatat:
- tanggal;
- branch;
- commit SHA;
- perubahan utama;
- hasil build/test/runtime;
- deployment state;
- rollback note;
- next checkpoint.

---

## WA-000 — Architecture & Contract
**Status: PASS / LOCKED (historical baseline)**
**Date:** 2026-10-04

Baseline awal:
- service terpisah dari RedHub;
- local-first Docker;
- Node.js + TypeScript + Fastify;
- Baileys provider adapter;
- persistent session;
- PDF attachment;
- multi-tenant direction;
- production target VPS `202.10.36.74`.

Catatan: bagian queue/campaign/retry-business dari baseline awal kemudian **disederhanakan secara eksplisit** pada WA-001A.

---

## WA-001 — Local Docker Foundation
**Status: PASS / LOCKED**
**Date:** 2026-10-04
**Branch:** `feat/redhub-wa-001-foundation`
**Implementation head:** `e7be8fda559242a34fbbd3b4814e16650b8bd139`

### Delivered
- isolated codebase `redhub-gateway/`;
- Node.js 22 + TypeScript + Fastify;
- Dockerfile multi-stage;
- Docker Compose;
- PostgreSQL 17;
- persistent PostgreSQL volume;
- persistent WhatsApp session volume placeholder;
- env/gitignore/dockerignore baseline;
- migration runner;
- `GET /health`;
- tests/typecheck/build;
- GitHub Actions reproducibility gate.

### Verification
GitHub Actions run **37171019886**:
- typecheck PASS;
- tests PASS;
- build PASS;
- Compose build/start PASS;
- PostgreSQL health PASS;
- migration PASS;
- gateway health PASS;
- restart smoke PASS.

### Lock
Foundation tetap dipakai. PostgreSQL pada scope terbaru hanya untuk metadata/log minimum bila diperlukan, **bukan campaign scheduler/queue engine**.

### Next
WA-001A / WA-002.

---

## WA-001A — Scope Simplification / Delivery-Layer Lock
**Status: PASS / LOCKED**
**Date:** 2026-10-05
**Branch:** `feat/redhub-wa-002-session`

### User Decision
Backend RedHub **sudah memiliki**:
- broadcast logic;
- reminder H-1;
- scheduling;
- recipient selection;
- meeting/event business logic.

Karena itu WA Gateway harus dibangun **sederhana**.

### Locked Responsibility Boundary

```text
RedHub Backend
  -> decides who/when/what to send
  -> calls internal gateway API

WA Gateway
  -> resolves tenant/device
  -> sends text or PDF/document
  -> returns provider result/error
  -> maintains persistent WhatsApp sessions
```

### Removed from Gateway V1
- campaign builder;
- broadcast scheduler;
- H-1 scheduler;
- recipient segmentation;
- campaign queue engine;
- business retry orchestration;
- business idempotency/duplicate policy;
- invitation/meeting domain logic.

### Still Required
- multi-tenant;
- persistent session;
- reconnect;
- text send;
- PDF/document send;
- auth;
- tenant isolation;
- minimal delivery result/log;
- production deployment.

### Evidence
Documentation source of truth updated:
- `REDHUB_WA_GATEWAY_START_HERE.md`;
- `REDHUB_WA_GATEWAY_MASTER_HANDOFF.md`;
- `REDHUB_WA_GATEWAY_CHECKPOINTS.md`;
- `REDHUB_WA_GATEWAY_DECISIONS.md`;
- `REDHUB_WA_GATEWAY_API_CONTRACT.md`.

Documentation commits for this scope revision:
- START HERE: `8d7e8e63536f90fe563fac44d5c64f9a09b0672b`;
- MASTER HANDOFF: `0cf5cf360ee344094d818f3bab439e75ce88165e`;
- CHECKPOINT initial revision: `18de2ed640c2856aca46350919a4561400d5bbe9`;
- DECISIONS: `6504ac1f79fc1b85914763d26a9e874c51f57910`;
- API CONTRACT: `33094bc47376e945e2f5c186e680e25ebea230ad`.

### Deployment State
Not deployed. Local-first remains locked.

### Rollback
If future requirements require gateway-side queue/scheduler, create a new decision/checkpoint. Do not silently restore superseded architecture.

### Next
**WA-002 — WhatsApp Device & Persistent Session**

---

## WA-002 — WhatsApp Device & Persistent Session
**Status: PASS / LOCKED**
**Date:** 2026-10-05
**Branch:** `feat/redhub-wa-002-session`
**Implementation commit:** `4890da8d0c56e15eca441827a43932bdeaf7a81c`

### Implemented
- Baileys `7.0.0-rc14`;
- multi-file persistent auth state;
- DISCONNECTED / CONNECTING / PAIRING / CONNECTED / ERROR;
- protected pairing endpoint;
- protected device status endpoint;
- protected JSON QR endpoint;
- protected PNG QR endpoint;
- tenant/device ID validation;
- reconnect for non-logout disconnect;
- optional auto-start after restart;
- graceful shutdown;
- session/auth data outside Git;
- bearer token on pairing/status routes.

### Automated Verification
GitHub Actions run **37171410041**: SUCCESS.
- typecheck PASS;
- tests PASS;
- build PASS;
- Docker Compose PASS;
- health/migration PASS;
- restart smoke PASS.

### Real-Device Verification — 2026-10-05
- real WhatsApp test number paired successfully;
- device status reached `CONNECTED`;
- tenant/device resolved as `jember` / `jember-main`;
- QR cleared after successful pairing;
- persistent session exists in Docker volume;
- container recreate with auto-start returned directly to `CONNECTED` without a new QR;
- explicit container stop/start also returned directly to `CONNECTED` without a new QR;
- runtime log hygiene check PASS after Baileys internal logging was silenced;
- temporary QR images and local verification scripts were deleted before commit.

### Acceptance Result
**PASS / LOCKED**

Real pairing, persistence, restart recovery, reconnect, and log hygiene are verified.

### Deployment State
Local only. VPS deployment has not started.

### Next
**WA-003 — Text Delivery API**

---

## WA-003 — Text Delivery API
**Status: PASS / LOCKED**
**Date:** 2026-10-05
**Branch:** `feat/redhub-wa-003-text-delivery`
**Implementation commit:** `5a816fd`
**Provider-error test commit:** `cdd0abc`

### Implemented
- `POST /api/v1/messages/text`;
- authenticated internal API only;
- tenant/device ownership validation;
- destination normalization and validation;
- Indonesian local `0...` normalization to `62...` baseline;
- connected-device guard;
- text length validation;
- Baileys text delivery;
- provider message ID returned;
- request correlation ID passthrough;
- safe error mapping;
- no campaign/broadcast/reminder logic in gateway.

### Automated Verification
Local Node verification:
- typecheck: PASS;
- unit tests: **9/9 PASS**;
- build: PASS.

Docker build verification:
- Docker image build: PASS;
- embedded typecheck/test/build: PASS;
- existing persistent session survived recreate;
- device returned directly to `CONNECTED` without new QR.

### Real API Verification
- invalid destination -> HTTP `400` / `INVALID_PHONE`: PASS;
- cross-tenant device use -> HTTP `403` / `DEVICE_TENANT_MISMATCH`: PASS;
- real text send -> HTTP `200`: PASS;
- response `success=true`: PASS;
- provider message ID present: PASS;
- request ID preserved: PASS.

Two controlled real sends were accepted by WhatsApp using the paired Jember test device.

### Log Hygiene Fix
Real send exposed hard-coded `libsignal` console output containing session ratchet material. Before checkpoint lock:
- source identified in `libsignal/src/session_record.js`;
- exact sensitive session-object console patterns are suppressed without disabling normal application logs;
- post-fix real send succeeded;
- post-send scan found no `remoteIdentityKey`, `rootKey`, `privKey`, `SessionEntry`, API token, or Authorization bearer material.

**Sensitive log scan: PASS**

### Final Real-Device Acceptance — 2026-10-05
User confirmed **both controlled real test messages were visibly received in WhatsApp**.

### Acceptance Result
**PASS / LOCKED**

Text delivery, tenant/device validation, provider response handling, real-device receipt, reconnect safety, and log hygiene are verified.

### Next
**WA-004 — PDF / Document Delivery API**

---

## WA-004 — PDF / Document Delivery API
**Status: PASS / LOCKED**
**Date:** 2026-10-05
**Branch:** `feat/redhub-wa-004-document-delivery`
**Implementation commit:** `f833ef3828b8d8a5d0fb12dc5a54149ded4f46ee`

### Implemented
- `POST /api/v1/messages/document`;
- authenticated internal API;
- tenant/device validation before PDF fetch;
- HTTP/HTTPS source validation;
- MIME `application/pdf` validation;
- PDF magic `%PDF-` validation;
- maximum PDF size 10 MB;
- streamed download with early cancel when limit exceeded;
- filename sanitization and automatic `.pdf` suffix;
- optional caption with length validation;
- in-memory delivery only — no temporary PDF file stored by gateway;
- Baileys document send with `application/pdf`;
- provider message ID returned;
- request correlation ID passthrough;
- safe provider error mapping.

### Automated Verification
Local Node verification:
- typecheck: PASS;
- unit tests: **16/16 PASS**;
- build: PASS.

Docker verification:
- Docker image build: PASS;
- embedded typecheck/test/build: PASS;
- persistent WhatsApp session survived recreate;
- device returned directly to `CONNECTED` without QR.

### Unit Coverage
- missing bearer token rejected;
- valid PDF fetched and sent in memory;
- filename/caption preserved after sanitization;
- invalid source protocol rejected;
- non-PDF MIME rejected;
- oversized PDF rejected before full body read;
- cross-tenant request rejected before external fetch;
- provider error returned safely.

### Real API Verification — 2026-10-05
Temporary PDF source was hosted locally for the test only.
- source reachable from gateway: HTTP `200`;
- content type: `application/pdf`;
- PDF magic: `%PDF-`;
- invalid source -> HTTP `400` / `INVALID_DOCUMENT_SOURCE`: PASS;
- cross-tenant -> HTTP `403` / `DEVICE_TENANT_MISMATCH`: PASS;
- real PDF send -> HTTP `200`: PASS;
- response `success=true`: PASS;
- filename returned: `Undangan Test WA-004.pdf`;
- provider message ID present: PASS;
- request ID preserved: PASS.

### Cleanup & Log Hygiene
- gateway uses in-memory PDF buffer only;
- gateway `/tmp` PDF count after test: `0`;
- temporary local PDF source/test scripts removed;
- sensitive log scan after real PDF send: PASS;
- no session key material, API token, Authorization header, filename, or caption leaked to logs.

### Final Real-Device Acceptance — 2026-10-05
User confirmed the real PDF was visibly received in WhatsApp as a document with:
- filename `Undangan Test WA-004.pdf`;
- caption `TEST REDHUB WA GATEWAY WA-004 - PDF document delivery berhasil.`

### Acceptance Result
**PASS / LOCKED**

PDF source validation, size/type guards, in-memory delivery, filename/caption handling, real-device receipt, tenant protection, cleanup, reconnect safety, and log hygiene are verified.

### Next
**WA-005 — Multi-Tenant Isolation**

---

## WA-005 — Multi-Tenant Isolation
**Status: PASS / LOCKED**
**Date:** 2026-10-05
**Branch:** `feat/redhub-wa-005-multitenant-isolation`
**Implementation commit:** `98c047ea4be6acaa86dea44226350f74719d036f`
**Tenant-neutral config commit:** `9cb6fdd01aec53c5b5fc5657ec185ed116ca4fbb`

### Implemented
- runtime registry keyed by `tenantId + deviceId`;
- tenant-scoped device listing/status/pairing lookup;
- cross-tenant device access rejected;
- session storage layout `SESSION_DIR/<tenantId>/<deviceId>/`;
- legacy single-tenant session migration to nested tenant/device path;
- persisted tenant sessions are discovered/restored on startup;
- same `deviceId` may exist under different tenants without collision;
- one-device tenant acts as implicit default when `deviceId` is omitted;
- multi-device tenant requires explicit `deviceId` via `DEVICE_REQUIRED`;
- Jember-specific fallback removed from core config; default tenant/device must be supplied by environment.

### Automated Verification
Local verification:
- typecheck: PASS;
- unit tests: **20/20 PASS**;
- build: PASS.

Docker verification:
- Docker image build: PASS;
- embedded typecheck/test/build: **20/20 PASS**;
- final image recreate: PASS.

### Unit Isolation Coverage
- tenant context required for status/list;
- same device ID can coexist in two tenants;
- tenant-scoped lookup returns correct owner;
- single-device tenant resolves implicit default;
- multi-device tenant requires explicit device ID;
- existing cross-tenant text/document protection regression tests remain PASS.

### Real Runtime Verification — 2026-10-05
Existing paired Jember session was migrated without unpairing:
- before migration rollback backup created outside Git;
- device returned directly to `CONNECTED`;
- `HAS_QR=false`;
- nested credential path exists: `jember/jember-main/creds.json`;
- legacy `jember-main/creds.json` path no longer exists;
- `GET /api/v1/devices?tenantId=jember` returned exactly one Jember device;
- wrong-tenant status lookup returned `404 DEVICE_NOT_FOUND`;
- explicit cross-tenant send attempt returned `403 DEVICE_TENANT_MISMATCH` and did not send;
- implicit-default resolution verified without sending by reaching phone validation (`400 INVALID_PHONE`);
- final sensitive-log scan: PASS.

### Rollback Evidence
Pre-migration local session archive created outside repository:
`D:\Projects\redhub-wa-gateway-backups\wa005-session-pre-migration.tgz`

This backup contains WhatsApp session credentials and must never be committed/shared.

### Acceptance Result
**PASS / LOCKED**

Tenant ownership, tenant-scoped session paths, default-device behavior, future multi-device semantics, migration compatibility, restart recovery, and log hygiene are verified.

### Next
**WA-006 — Minimal Delivery Log & Error Contract**

---

## WA-006 — Minimal Delivery Log & Error Contract
**Status: PASS / LOCKED**
**Date:** 2026-10-05
**Branch:** `feat/redhub-wa-006-delivery-log`
**Implementation commit:** `4b5d560c7a95d3d9604ad261bf91269917f0b856`

### Implemented
- migration `002_delivery_logs.sql`;
- PostgreSQL `delivery_logs` table for operational audit only;
- correlation `requestId` preserved when supplied;
- UUID requestId generated when omitted;
- requestId bounded to 128 characters;
- tenant/device/message type recorded;
- destination stored **masked only**;
- provider message ID stored on successful delivery;
- result `SENT` / `FAILED`;
- safe error code and generic safe error message;
- database timestamp `created_at`;
- text and PDF/document delivery both covered;
- audit-log persistence failure is isolated and does not convert a successful WhatsApp send into failure.

### Automated Verification
Local gate:
- typecheck: PASS;
- unit tests: **25/25 PASS**;
- build: PASS.

Docker gate:
- Docker build: PASS;
- embedded typecheck/test/build: **25/25 PASS**;
- gateway recreate: PASS;
- Jember session returned to `CONNECTED` with `HAS_QR=false`.

### Database Verification
- `002_delivery_logs.sql` present in `schema_migrations`;
- `delivery_logs` table exists;
- schema contains `destination_masked` and **does not contain a raw destination/phone column**.

### Real Runtime Verification — 2026-10-05
One controlled real text send was used to verify the successful audit path:
- send HTTP `200` / success;
- provider message ID present;
- requestId `wa006-real-sent-001` persisted;
- audit row `SENT` persisted with tenant/device/type/timestamp;
- destination persisted only as masked value.

One controlled invalid-destination request verified the failure audit path without sending a WhatsApp message:
- HTTP `400` / `INVALID_PHONE`;
- requestId `wa006-real-failed-001` persisted;
- audit row `FAILED` persisted;
- destination stored as `***`;
- no provider message ID for failed request.

### Log Hygiene
- application/session sensitive-log scan: PASS;
- no Baileys/libsignal key material detected;
- no API token / Authorization bearer detected;
- relevant WhatsApp destination prefix did not appear unmasked in gateway logs.

### Failure Isolation
Unit test confirms a delivery-log database INSERT failure does **not** turn a successful WhatsApp delivery response into failure. This prevents RedHub from resending solely because audit persistence failed.

### Explicit Non-Goal
No campaign queue, scheduler, campaign retry worker, or business duplicate engine.

### Acceptance Result
**PASS / LOCKED**

Correlation, masked audit data, provider result, safe failures, timestamps, persistent DB migration, and audit-failure isolation are verified.

### Next
**WA-007 — Security Gate**

---

## WA-007 — Security Gate
**Status: PASS / LOCKED**
**Date:** 2026-10-05
**Branch:** `feat/redhub-wa-007-security-gate`
**Security implementation commit:** `391c43b416d94ae9705d26aed9a6c5665cdd4e06`
**Compose hardening commit:** `d01ac40926a43a7fc31e927afca8e48d2b4733be`

### Implemented
- bearer authentication remains mandatory for every endpoint except `GET /health`;
- API token config rejects secrets shorter than 32 characters and placeholder values;
- tenant/device IDs validated against bounded safe identifiers;
- Fastify JSON body limit set to 64 KiB;
- tenant ownership/cross-tenant protection preserved;
- PDF maximum remains 10 MiB;
- document source policy hardened against SSRF;
- public document URLs require HTTPS by default;
- HTTP/private/internal document hosts are accepted only when explicitly listed in `DOCUMENT_ALLOWED_HOSTS`;
- URL credentials are rejected;
- localhost/private/reserved IP targets are rejected unless the exact host is explicitly allowlisted;
- DNS-resolved private/reserved addresses are rejected for non-allowlisted hosts;
- redirects are manual, limited, and revalidated before every hop;
- filename sanitation and PDF magic/MIME validation remain mandatory;
- Authorization header configured for logger redaction;
- libsignal/Baileys sensitive log suppression retained;
- session directory permissions hardened to `700`;
- session credential/key files hardened to `600`;
- gateway container runs as non-root `app` user;
- Compose no longer supplies weak fallback DB/API secrets or tenant/device defaults;
- gateway host port remains loopback-only `127.0.0.1:3410`.

### Automated Verification
Local source gate:
- typecheck: PASS;
- unit tests: **30/30 PASS**;
- build: PASS.

Docker image gate:
- embedded typecheck/test/build: **30/30 PASS**;
- Docker build: PASS;
- Compose config validation: PASS;
- gateway recreate: PASS.

Security test coverage includes:
- private/reserved IPv4/IPv6 rejection;
- HTTPS-by-default document source policy;
- explicit internal-host allowlist;
- redirect-to-private rejection;
- unsafe tenant/device ID rejection;
- oversized JSON rejection;
- existing bearer auth, cross-tenant, PDF limit, error safety, and log regression coverage.

### Runtime Verification — 2026-10-05
After security image activation:
- `GET /health` -> HTTP 200;
- Jember device -> `CONNECTED`;
- `HAS_QR=false`;
- session survived every security recreate without unpairing;
- `DOCUMENT_ALLOWED_HOSTS=host.docker.internal` active for local test only;
- API token length in runtime: 64;
- weak token config test: rejected;
- anonymous protected endpoint request -> HTTP 401 / `UNAUTHORIZED`;
- container identity -> non-root `app`;
- gateway host exposure -> `127.0.0.1:3410` only;
- PostgreSQL has no published host port.

### Session Permission Verification
- `SESSION_DIR`: `700 app:app`;
- tenant directory: `700 app:app`;
- device directory: `700 app:app`;
- `creds.json`: `600 app:app`;
- unique mode for files in active session directory: `600`.

### Safe URL Runtime Verification
Tests were performed without sending WhatsApp messages:
- direct private source `127.0.0.1` -> `400 INVALID_DOCUMENT_SOURCE`;
- explicitly allowlisted `host.docker.internal` source was fetched successfully, then test stopped at intentionally invalid phone -> `400 INVALID_PHONE`;
- allowlisted source redirecting to private IP -> `400 INVALID_DOCUMENT_SOURCE`;
- non-allowlisted public HTTP URL -> `400 INVALID_DOCUMENT_SOURCE`.

### Secret / Git / Log Verification
- local `.env` is ignored by Git;
- local `.env` is not tracked;
- WhatsApp session/credential paths are not tracked;
- previous local development API token is not present in Git;
- Authorization leak marker produced HTTP 401 and was absent from gateway logs;
- sensitive-log scan found no libsignal key material, API token, or bearer header.

### Acceptance Result
**PASS / LOCKED**

Bearer auth, payload validation, tenant ownership, PDF/document limits, SSRF protection, filename sanitation, secret/session handling, runtime permissions, non-root execution, loopback-only exposure, and log hygiene are verified.

---

## WA-008 — Actual RedHub Backend Integration Validation
**Status: PASS / LOCKED**
**Date:** 2026-10-05
**Branch:** `feat/redhub-wa-008-redhub-contract`
**Gateway contract harness commit:** `5468595bf3270f95585ce5fb3bde1e4540e7d29e`

### Goal
Validate that the **actual RedHub backend** can call gateway without moving broadcast/reminder logic into gateway.

### Gateway-Side Preparation — PASS
Delivered:
- `docs/REDHUB_BACKEND_INTEGRATION.md`;
- `redhub-gateway/scripts/redhub-contract-smoke.mjs`;
- npm script entry for contract smoke;
- exact text/document payload and response contract documented;
- backend retry ownership documented;
- H-1 and broadcast responsibility boundary documented.

Regression gate after harness addition:
- typecheck: PASS;
- unit tests: **30/30 PASS**;
- build: PASS.

Non-sending contract smoke against the real local gateway:
- health: PASS;
- tenant/device mapping: PASS;
- device CONNECTED contract: PASS;
- unauthorized contract: PASS;
- text error contract + requestId preservation: PASS;
- document error contract + requestId preservation: PASS;
- WhatsApp messages sent by harness: **0**.

### Actual Backend Recovery and Integration — PASS
The previous external dependency is resolved.

Verified actual backend:
- production runtime: `redhub-hybrid.service` on VPS `202.10.36.74`;
- recovered private source repository: `bambangirawanlawyer/redhub-backend`;
- backend integration branch: `feat/redhub-wa-gateway-provider`;
- RedHub retains broadcast, recipient selection, TEST/LIVE mode, invitation templates, H-1 scheduling, business logs, and retry/business decisions;
- delivery adapter `REDHUB_GATEWAY` calls the gateway text/PDF APIs;
- Jember mapping: organization/tenant `jember`, device `jember-main`;
- backend adapter connection test: PASS / device `CONNECTED`;
- backend -> gateway TEXT delivery: SENT;
- backend -> gateway DOCUMENT/PDF delivery: SENT;
- authenticated `broadcastMeetingInvitation` business-flow UAT: HTTP 200 / `SENT` / sent 1 / failed 0;
- Firestore recorded `lastTestBroadcastProvider=REDHUB_GATEWAY` and `lastTestBroadcastStatus=SENT`;
- user visually confirmed the RB-002 invitation/PDF arrived in WhatsApp;
- gateway delivery audit persisted the business-flow delivery as `SENT`;
- backend and gateway sensitive-log scans: PASS;
- Fonnte credential remains available for rollback;
- production remains in `TEST` mode until WA-010 go-live gate.

### Acceptance Result
**PASS / LOCKED**

WA-008 is no longer blocked or deferred. The actual RedHub backend source/runtime is recovered, versioned in GitHub, and verified against the production WA Gateway.

---

## WA-009 — Production Deployment
**Status: PASS / LOCKED**
**Date:** 2026-10-05
**Branch:** `feat/redhub-wa-009-vps-deploy`

### Target
VPS `202.10.36.74`.

### Pre-Deployment Preparation — PASS
Delivered on branch `feat/redhub-wa-009-vps-deploy`:
- `docs/REDHUB_WA_GATEWAY_WA009_DEPLOYMENT.md`;
- `redhub-gateway/scripts/wa009-preflight.sh`;
- `redhub-gateway/scripts/backup-production.sh`;
- `redhub-gateway/scripts/verify-backup.sh`;
- `backups/` added to Git ignore.

Local verification:
- Docker Compose config validation: PASS;
- all Linux deployment scripts syntax-checked inside Alpine container: PASS;
- local session backup created successfully;
- local PostgreSQL custom-format backup created successfully;
- session archive contains `creds.json`;
- PostgreSQL dump readability verification: PASS;
- backup verification was non-destructive;
- existing local WhatsApp session remained CONNECTED.

### Production Deployment Progress -- 2026-10-05
- trusted ED25519 SSH key authorized for `root@202.10.36.74`;
- SSH access verified as `root` on host `redvote.id`;
- existing production services audited before deployment;
- existing `nginx` and `redhub-hybrid.service` remained active and were not reconfigured;
- existing RedHub hybrid service remains on `127.0.0.1:8787` behind Nginx;
- Docker Engine `27.5.1` and Docker Compose `2.33.1` installed;
- WA Gateway source deployed to `/opt/redhub-wa-gateway` from verified branch `feat/redhub-wa-009-vps-deploy` at commit `4dfbb700a84e712691408bebd08c7603dcd15cbb`;
- WA-009 preflight: PASS;
- production `.env` created on VPS with new strong secrets; secrets were not printed or committed;
- `DOCUMENT_ALLOWED_HOSTS` left empty for production baseline;
- PostgreSQL container healthy with no published host port;
- gateway container healthy on `127.0.0.1:3410` only;
- `GET /health` -> HTTP 200 / database `ok`;
- production WhatsApp device `jember/jember-main` paired successfully;
- device reached `CONNECTED`, `HAS_QR=false`;
- gateway container restart returned automatically to `CONNECTED` without a new QR;
- production session `creds.json` mode verified `600`;
- gateway container identity verified non-root `app`;
- sensitive-log scan: PASS;
- production session + PostgreSQL backup created;
- non-destructive backup verification: `BACKUP_VERIFY=PASS`;
- controlled production text request -> HTTP 200 / provider message ID returned / delivery log `SENT`;
- controlled production PDF request -> HTTP 200 / provider message ID returned / delivery log `SENT`;
- existing `nginx` and `redhub-hybrid.service` remained active after deployment and restart tests;
- old VPS `202.10.45.147` was not touched.

### Final Acceptance — 2026-10-05
- user confirmed both controlled production messages were visibly received: text + `RedHub-WA009-Test.pdf`;
- full VPS reboot completed successfully;
- SSH returned after reboot;
- Docker, Nginx, and `redhub-hybrid.service` returned active automatically;
- PostgreSQL and gateway containers returned healthy automatically;
- `GET /health` remained HTTP 200 / database `ok`;
- WhatsApp session returned to `CONNECTED` with `HAS_QR=false` without re-pairing;
- production TEXT and DOCUMENT delivery log rows remained persisted as `SENT`;
- gateway exposure remained loopback-only on `127.0.0.1:3410`;
- PostgreSQL remained without a published host port;
- isolated session restore test from production backup: PASS;
- isolated PostgreSQL restore test from production backup: PASS;
- temporary restore database/session test data was removed after verification;
- existing Nginx and RedHub hybrid service remained healthy;
- old VPS `202.10.45.147` was not touched.

### Acceptance Result
**PASS / LOCKED**

WA-009 production deployment, pairing, persistence, delivery, backup/restore, reboot recovery, network isolation, coexistence with existing services, and user-visible receipt are verified.

**Deployment evidence commit:** `37d1356`

### Required
- Docker + Compose;
- production env/secrets;
- persistent session volume;
- PostgreSQL only if required for metadata/log;
- firewall/private network;
- reverse proxy/HTTPS if necessary;
- restart policy;
- backup session/config;
- monitoring baseline.

### Acceptance
- gateway healthy after reboot;
- session survives restart;
- no unintended public port;
- existing services unaffected;
- backup/restore basic test PASS.

### Safety
VPS lama `202.10.45.147` tidak disentuh.

---

## WA-010 — Production End-to-End
**Status: PASS / LOCKED**
**Date:** 2026-10-05
**Branch:** `feat/redhub-wa-009-vps-deploy`

### H-1 Reminder End-to-End
- dedicated UAT meeting: `wa010-reminder-e2e-20261005`;
- reminder mode remained `TEST`;
- RedHub reminder worker was triggered exactly once;
- `redhub-reminders.service` result: `success`;
- Firestore recorded `reminderStatus=SENT`;
- Firestore recorded `reminderProvider=REDHUB_GATEWAY`;
- gateway delivery audit recorded the matching `TEXT / SENT` delivery;
- routing resolved to `jember / jember-main`.

### Routing / Error Safety
- normal Jember tenant/device connection: `CONNECTED`;
- cross-tenant lookup through the RedHub gateway adapter returned `DEVICE_NOT_FOUND`;
- no cross-tenant session was used;
- existing gateway validation/error contract from WA-005/WA-007 remains intact.

### Restart / Persistence
- gateway container restart completed successfully;
- health returned `status=ok` / database `ok`;
- WhatsApp briefly entered `CONNECTING` during restart recovery;
- it returned to `CONNECTED` automatically without re-pairing;
- backend service and reminder timer remained active.

### Rollback Gate
- Fonnte rollback credential remains stored;
- Fonnte was not deleted during go-live;
- rollback remains available if the RedHub Gateway must be disabled.

### Controlled Go-Live
- Jember broadcast mode changed from `TEST` to `LIVE` only after the previous gates passed;
- selected production provider remained `REDHUB_GATEWAY`;
- first controlled LIVE send targeted only the configured test recipient;
- LIVE validation send result: `SENT 1 / FAILED 0`;
- gateway delivery audit recorded the LIVE `TEXT / SENT` result;
- tenant/device in audit: `jember / jember-main`;
- scheduled reminders that existed before go-live remain explicitly stored as `TEST` (4 scheduled reminders), preventing accidental retroactive LIVE delivery.

### Final Production State
- provider: `REDHUB_GATEWAY`;
- broadcast mode: `LIVE`;
- tenant/device: `jember / jember-main`;
- WhatsApp: `CONNECTED`;
- backend: active;
- reminder timer: active;
- gateway/PostgreSQL: healthy;
- Fonnte credential: retained for rollback.

### Acceptance Result
**PASS / LOCKED**

WA Gateway V1 is complete and ready for normal RedHub LIVE use. Future changes must use a new checkpoint and must not silently alter the locked delivery-layer responsibility boundary.

---

## Superseded Old Planned Checkpoints

Rencana lama berikut tidak lagi menjadi capability wajib gateway:
- old WA-005 Queue Engine;
- old WA-006 Reliability & Idempotency business engine;
- invitation renderer/business template inside gateway;
- gateway-side broadcast/reminder orchestration.

Histori tidak dihapus; digantikan oleh WA-001A atas instruksi eksplisit user.

---

## CURRENT POSITION

- **WA-008:** PASS / LOCKED — actual RedHub backend recovered and integrated with production gateway
- **WA-009:** PASS / LOCKED — production gateway deployment
- **WA-010:** PASS / LOCKED — production end-to-end and controlled go-live complete
- **WA-011:** PASS / LOCKED — RedHub multi-device management, QR pairing and sender selection complete
- **WA GATEWAY V1:** COMPLETE / LIVE
- **PRODUCTION PROVIDER:** `REDHUB_GATEWAY`
- **BROADCAST MODE:** `TEST` (current organization setting; WA-010 historical go-live remains locked)
- **TENANT:** `jember`
- **DEVICES:** `jember-main` + `jember-02`
- **DEFAULT DEVICE:** `jember-main` (`6285702459733`)
- **WHATSAPP:** both devices `CONNECTED`
- **ROLLBACK:** Fonnte credential retained
- **TARGET VPS:** `202.10.36.74`
- **NEXT:** normal operation; future capabilities or architecture changes require a new checkpoint
- **WORKFLOW:** local first -> verified -> checkpoint -> production


---

## WA-011 — RedHub Device Management & Pairing Integration

**Status: PASS / LOCKED**
**Date:** 2026-10-05
**Branch:** `feat/redhub-wa-011-device-management`

### Locked Scope

Enable RedHub operators to manage WhatsApp sender devices without opening a
terminal or the VPS:

- list all WhatsApp devices for the active tenant;
- add/start a new device pairing flow;
- display QR pairing state;
- display CONNECTED / CONNECTING / PAIRING / DISCONNECTED / ERROR;
- select one CONNECTED device as organization default;
- allow an explicit device to be selected for a meeting broadcast;
- preserve the selected/default device for that meeting's H-1 reminder.

### Gateway Capability

No gateway business-logic expansion is required.

Existing gateway V1 already provides the required delivery/session primitives:
- tenant-scoped device list;
- protected device start/pair endpoint;
- protected status endpoint;
- protected pairing QR endpoint;
- persistent sessions at `SESSION_DIR/<tenantId>/<deviceId>/`;
- multiple devices per tenant;
- explicit `deviceId` on text/PDF delivery;
- cross-tenant isolation.

The gateway remains delivery-only. Default-device choice and sender selection
remain RedHub backend business configuration.

### Backend Gate

**RB-004 — PASS / LOCKED**

Production backend now exposes:
- `listWhatsappDevices`;
- `startWhatsappDevicePairing`;
- `getWhatsappDevicePairing`;
- `setDefaultWhatsappDevice`;
- per-broadcast `gatewayDeviceId` sender override;
- H-1 reminder persistence of the selected/default device.

Production smoke:
- tenant `jember` listed successfully;
- `jember-main` = CONNECTED;
- sender phone = `6285702459733`;
- management endpoint remains authenticated (anonymous request -> 401);
- existing gateway/session remained healthy.

### Production Acceptance

- authoritative Flutter source recovered and verified against the active production build;
- UI-018 device-management frontend implemented and deployed;
- device list/status rendering: PASS;
- QR pairing from RedHub: PASS;
- pairing resume / `Tampilkan QR`: PASS;
- default-device action exposed in RedHub: PASS;
- broadcast sender selector implemented for CONNECTED devices: PASS;
- second controlled device `jember-02` paired successfully;
- `jember-main` = CONNECTED (`6285702459733`);
- `jember-02` = CONNECTED (`6285806700300`);
- controlled TEXT send through `jember-02`: `sent=1`, `failed=0`;
- gateway delivery audit records `jember-02` TEXT and DOCUMENT deliveries as SENT;
- Flutter analyze: PASS / no issues;
- focused WhatsApp UI regression: PASS;
- active frontend release after QR resume hotfix: `/var/www/redhub.redvote.id/releases/20261006-010820`;
- active backend release: `/opt/redhub-hybrid/releases/20261006-003054`;
- backend, reminder timer, gateway and PostgreSQL remain healthy;
- gateway token remains server-side only;
- default sender is intentionally operator-selectable and was not forced automatically.

### Acceptance Result

**PASS / LOCKED**

WA-011 is complete. Multi-device management, pairing and sender selection are now available from RedHub without terminal/VPS access while the gateway remains a delivery-only layer.

---

## WA-012 — Inline PNG Document Delivery for RedHub QR
**Status: PASS / LOCKED (source + local gate; production deploy pending)**
**Date:** 2026-10-07
**Branch:** `feat/redhub-wa-011-device-management`

### Purpose
Support secure RedHub QR delivery without exposing the QR credential through a permanent public file URL.

### Backward-compatible API extension
`POST /api/v1/messages/document` keeps the existing PDF URL contract and now accepts exactly one document source:

1. existing PDF URL:
   - `documentUrl`
   - fetched with the existing SSRF/HTTPS/size/type policy;
   - delivered as `application/pdf`.

2. new inline QR PNG:
   - `documentBase64`
   - `mimeType = image/png`
   - maximum decoded size **32 KiB**;
   - PNG signature required;
   - delivered from memory directly to Baileys.

The existing Fastify **64 KiB request body limit remains unchanged**.

### Security
- bearer auth unchanged;
- tenant/device ownership unchanged;
- inline source cannot be combined with `documentUrl`;
- only `image/png` is accepted for inline delivery;
- no QR file is written to public storage by the gateway;
- no raw QR credential is added to delivery logs;
- PDF URL SSRF protections remain unchanged.

### Verification
- gateway tests: **32 / 32 PASS**;
- typecheck: **PASS**;
- TypeScript build: **PASS**;
- existing oversized JSON body-limit test remains PASS;
- existing PDF document delivery tests remain PASS;
- new inline PNG delivery test PASS;
- ambiguous URL + inline source rejection PASS.

### Deployment State
Not deployed to production yet. Existing production gateway behavior remains unchanged until a controlled WA-012 cutover is explicitly performed.

### Rollback
The extension is additive. Existing RedHub PDF delivery remains on `documentUrl`; rollback is the previous gateway release with no RedHub schema migration required.
