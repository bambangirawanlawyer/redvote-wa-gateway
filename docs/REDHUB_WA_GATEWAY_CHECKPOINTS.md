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
**Status: PENDING**

### Required
- `POST /api/v1/messages/text`;
- tenant/device resolve;
- phone normalization/validation;
- send text;
- return provider message ID/status/error;
- no campaign logic.

### Acceptance
- one real text received;
- invalid phone rejected;
- wrong tenant/device rejected;
- safe provider error;
- no secret leakage.

---

## WA-004 — PDF / Document Delivery API
**Status: PENDING**

### Required
- `POST /api/v1/messages/document`;
- source URL/file handling;
- MIME/type/size validation;
- safe filename;
- caption optional;
- send WhatsApp document;
- temp cleanup.

### Acceptance
- one real PDF received as document;
- filename correct;
- caption correct when supplied;
- invalid source rejected safely;
- temp data cleaned.

---

## WA-005 — Multi-Tenant Isolation
**Status: PENDING**

### Required
- tenant registry/identity;
- device/session ownership;
- one default device per tenant baseline;
- future multi-device compatible;
- multiple tenant sessions can coexist.

### Acceptance
- tenant A cannot use tenant B session/device;
- session paths isolated;
- tenant-specific status/pairing/send works;
- no permanent Jember hard-code in core.

---

## WA-006 — Minimal Delivery Log & Error Contract
**Status: PENDING**

### Required
- request/correlation ID;
- tenant;
- destination masked in logs;
- provider message ID;
- result SENT/FAILED;
- safe error code/message;
- timestamp.

### Explicit Non-Goal
No campaign queue, scheduler, campaign retry worker, or business duplicate engine.

---

## WA-007 — Security Gate
**Status: PENDING**

### Required
- bearer auth;
- payload validation;
- tenant ownership checks;
- PDF/document limit;
- safe URL policy;
- filename sanitation;
- secret/session review;
- log hygiene;
- no anonymous send.

### Acceptance
- unauthorized rejected;
- malformed payload rejected;
- cross-tenant rejected;
- secret scan clean;
- session not tracked by Git.

---

## WA-008 — Local RedHub Contract Validation
**Status: PENDING**

### Goal
Validate that backend RedHub can call gateway without moving broadcast/reminder logic into gateway.

### Acceptance
- backend can send text request;
- backend can send PDF request;
- tenant mapping works;
- gateway result/error can be consumed;
- reminder H-1 remains triggered by backend RedHub.

---

## WA-009 — Production Deployment
**Status: PENDING**

### Target
VPS `202.10.36.74`.

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
**Status: PENDING**

### Validate
- RedHub backend -> gateway -> WhatsApp text;
- RedHub backend -> gateway -> WhatsApp PDF;
- multi-tenant routing;
- H-1 reminder initiated by RedHub backend;
- provider response/error handling;
- restart recovery;
- no cross-tenant session use.

### Exit Gate
WA Gateway V1 COMPLETE hanya setelah WA-010 PASS / LOCKED.

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

- **LAST PASS / LOCKED:** WA-002 — WhatsApp Device & Persistent Session
- **IN PROGRESS:** none
- **NEXT:** WA-003 — Text Delivery API
- **VPS DEPLOY:** NOT STARTED
- **TARGET VPS:** `202.10.36.74`
- **WORKFLOW:** local first -> verified -> checkpoint -> production
