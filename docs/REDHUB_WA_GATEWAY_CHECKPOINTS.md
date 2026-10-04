# REDHUB WA Gateway — Checkpoints

> Checkpoint log untuk proyek RedHub WA Gateway. Dokumen ini terpisah dari CHECKPOINTS.md REDVOTE WA Gateway lama.

## Status Convention

- **NEXT** — tahap berikut yang harus dikerjakan.
- **IN PROGRESS** — sedang dikerjakan, belum boleh dianggap selesai.
- **PASS** — acceptance criteria sudah diuji.
- **PASS / LOCKED** — lulus dan keputusan/hasil dikunci.
- **BLOCKED** — ada blocker nyata yang harus diselesaikan.
- **FAILED** — acceptance criteria gagal.

Setiap PASS harus mencatat:
- tanggal;
- branch;
- commit SHA;
- file utama yang berubah;
- hasil build/test;
- bukti endpoint/behavior;
- migration bila ada;
- deployment state;
- rollback note;
- next checkpoint.

---

## WA-000 — Architecture & Contract
**Status: PASS / LOCKED**  
**Date:** 2026-10-04

### Locked
- Tujuan: gateway mandiri agar RedHub tidak bergantung pada Fonnte.
- Gateway dibangun sebagai service terpisah dari backend utama RedHub.
- Integrasi RedHub ditunda sampai gateway selesai.
- Local-first menggunakan Docker.
- Node.js + TypeScript + Fastify.
- PostgreSQL untuk persistence dan queue.
- Baileys sebagai provider adapter V1.
- Provider abstraction wajib agar future Meta Cloud API dapat ditambahkan tanpa membongkar RedHub.
- Outbound only.
- Pilot 1 nomor WhatsApp Jember.
- Message invitation terpersonalisasi.
- PDF resmi dikirim sebagai document attachment.
- Persistent WhatsApp session.
- Retry terbatas.
- Idempotency / anti duplicate.
- Delivery log.
- Multi-tenant ready.
- Default future architecture: 1 tenant/kabupaten = 1 nomor WA.
- Future: satu tenant dapat memiliki lebih dari satu device.
- No Redis pada V1.
- No Chromium/Puppeteer pada baseline.
- No inbox/chatbot/CRM/marketing blast pada V1.
- Production target VPS: 202.10.36.74.
- Production deployment hanya setelah local validation selesai.

### Documentation
- `docs/REDHUB_WA_GATEWAY_MASTER_HANDOFF.md`
- `docs/REDHUB_WA_GATEWAY_CHECKPOINTS.md`
- `docs/REDHUB_WA_GATEWAY_DECISIONS.md`
- `docs/REDHUB_WA_GATEWAY_API_CONTRACT.md`

### Acceptance Result
PASS — architecture, scope, message/PDF requirement, multi-tenant direction, local-first workflow, provider abstraction, and deployment sequence telah disepakati.

---

## WA-001 — Local Docker Foundation
**Status: NEXT**

### Goal
Membuat foundation gateway yang reproducible di local PC.

### Required
- Node.js + TypeScript project.
- Fastify server.
- Dockerfile.
- docker-compose.yml.
- PostgreSQL container.
- Persistent data volume.
- Persistent WhatsApp session volume placeholder.
- `.env.example`.
- Secret-safe `.gitignore`.
- Migration mechanism.
- Structured logging baseline.
- `GET /health`.
- Graceful shutdown.
- Test/build scripts.

### Acceptance Criteria
- `docker compose build` PASS.
- `docker compose up -d` PASS.
- gateway container healthy.
- PostgreSQL healthy.
- migration PASS.
- health endpoint returns expected response.
- restart containers without data loss.
- no secret committed.
- working tree clean after commit.
- checkpoint updated with commit SHA.

### Must Not Do
- Jangan pairing WhatsApp sebelum foundation PASS.
- Jangan deploy VPS pada tahap ini.
- Jangan ubah backend RedHub.

---

## WA-002 — WhatsApp Device & Persistent Session
**Status: PENDING**

### Required
- Baileys provider adapter.
- create/start device.
- QR/pairing state.
- connection state.
- persistent auth/session.
- reconnect logic.
- device status.
- restart survival.

### Acceptance Criteria
- nomor test berhasil pairing;
- status CONNECTED valid;
- container restart tidak membutuhkan pairing ulang;
- disconnect/reconnect test lulus;
- session directory tidak masuk Git;
- credential/session tidak muncul di log.

---

## WA-003 — Basic Sending
**Status: PENDING**

### Required
- phone normalization;
- destination validation;
- send text;
- provider message id;
- sent/failed persistence;
- test-send endpoint.

### Acceptance Criteria
- 1 pesan test berhasil diterima;
- provider message ID tersimpan;
- nomor invalid ditolak;
- error tidak membocorkan credential;
- status DB sesuai hasil.

---

## WA-004 — PDF Invitation
**Status: PENDING**

### Required
- invitation template;
- recipient personalization;
- fetch/read PDF source;
- PDF content/type validation;
- human-readable filename;
- send as WhatsApp document;
- temp cleanup;
- support same PDF source for many recipients without permanent duplication.

### Acceptance Criteria
- template tampil sesuai baseline;
- nama penerima benar;
- agenda/tanggal/jam/tempat benar;
- PDF diterima sebagai file;
- filename benar;
- temp file bersih;
- failure PDF menghasilkan error terkontrol.

---

## WA-005 — Queue Engine
**Status: PENDING**

### Required
- persistent PostgreSQL queue;
- worker;
- PENDING -> PREPARING -> SENDING -> SENT;
- failure states;
- controlled processing;
- restart recovery;
- queue summary.

### Acceptance Criteria
- queue survive container restart;
- pending jobs dilanjutkan;
- sent job tidak diproses ulang;
- failed job dapat diarahkan ke retry;
- worker shutdown graceful.

---

## WA-006 — Reliability & Idempotency
**Status: PENDING**

### Required
- idempotency key unique;
- duplicate request protection;
- retry limit;
- retry state;
- attempt history;
- safe recovery after crash/restart.

### Acceptance Criteria
- request identik dua kali menghasilkan satu logical delivery;
- retry history tercatat;
- sent message tidak dikirim ulang oleh worker restart;
- failure final teridentifikasi jelas.

---

## WA-007 — Multi-Tenant Foundation
**Status: PENDING**

### Required
- tenant table/model;
- device belongs to tenant;
- message belongs to tenant;
- per-tenant default device;
- isolation checks;
- future multiple devices per tenant allowed by schema.

### Acceptance Criteria
- tenant A tidak dapat menggunakan device tenant B;
- queue/log filter per tenant;
- pilot Jember berjalan sebagai tenant pertama;
- tidak ada hard-coded permanent Jember ownership pada core.

---

## WA-008 — Security & Audit
**Status: PENDING**

### Required
- internal API authentication;
- request validation;
- secret review;
- session permission review;
- URL/file validation;
- PDF size limit;
- filename sanitation;
- phone masking support;
- audit events;
- no arbitrary public send endpoint.

### Acceptance Criteria
- unauthorized request rejected;
- malformed payload rejected;
- secret scan clean;
- auth/session files ignored by Git;
- sensitive logs reviewed.

---

## WA-009 — Production Deployment
**Status: PENDING**

### Target
VPS `202.10.36.74`.

### Baseline VPS
- Ubuntu 24.04 LTS
- 2 vCPU
- 3.8 GiB RAM
- 80 GB disk
- ~73 GB available at baseline
- swap 256 MB at baseline
- Docker not installed at baseline

### Required Before Deploy
- upgrade swap target ~2 GB;
- install Docker + Compose;
- firewall;
- production environment file;
- persistent volumes;
- backup plan;
- service/container resource limits after measurement;
- Nginx/HTTPS if endpoint exposure is needed;
- private network/localhost access from RedHub when co-located.

### Acceptance Criteria
- gateway healthy after VPS reboot;
- PostgreSQL healthy;
- session survives restart;
- no unintended public port;
- backup/restore basic test;
- monitoring basic PASS;
- existing services not disrupted.

---

## WA-010 — End-to-End Validation
**Status: PENDING**

### Staged Test
1. 1 recipient.
2. 10 recipients.
3. 50 recipients.
4. 100 recipients.

### Validate
- personalized text;
- PDF attachment;
- queue;
- delivery state;
- restart recovery;
- retry;
- idempotency;
- resource usage;
- no uncontrolled duplicate.

### Exit Gate
Hanya jika WA-010 **PASS / LOCKED**, pekerjaan integrasi backend RedHub boleh dimulai.

---

# RedHub Integration Phase

## RH-WA-001 — RedHub Backend Client
**Status: WAITING FOR WA-010**

RedHub backend memanggil gateway API dengan tenant, participant, meeting dan PDF data.

## RH-WA-002 — Device/Admin Integration
**Status: WAITING FOR RH-WA-001**

Expose device status/pairing sesuai role RedHub.

## RH-WA-003 — Meeting Invitation Integration
**Status: WAITING**

Meeting + participant selection -> invitation jobs.

## RH-WA-004 — Delivery Status UI
**Status: WAITING**

Admin melihat pending/sent/failed/retry state.

## RH-WA-005 — Production Validation
**Status: WAITING**

End-to-end dari dashboard RedHub sampai WhatsApp anggota.

---

## CURRENT POSITION

- **LAST PASS / LOCKED:** WA-000 — Architecture & Contract
- **NEXT:** WA-001 — Local Docker Foundation
- **VPS DEPLOY:** NOT STARTED
- **REDHUB BACKEND CHANGE:** NOT STARTED BY DESIGN
- **Rule:** jangan melompati checkpoint wajib.
