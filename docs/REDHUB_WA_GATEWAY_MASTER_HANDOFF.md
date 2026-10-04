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
- tidak ada anonymous send endpoint;
- validate tenant ownership;
- validate phone;
- validate document source;
- limit ukuran document;
- no secret/session in Git/log;
- session volume permission ketat;
- private network/localhost diprioritaskan bila RedHub dan gateway co-located;
- HTTPS/reverse proxy hanya bila endpoint perlu diekspos.

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
- bearer auth;
- validation;
- secret/session review;
- document limits;
- log hygiene.

### WA-008 — Local RedHub Contract Validation
Backend RedHub memanggil gateway dengan payload text/PDF tanpa memindahkan broadcast/reminder logic.

### WA-009 — VPS Deployment
Deploy ke `202.10.36.74`, persistent volume, firewall/private networking, restart test, backup baseline.

### WA-010 — Production End-to-End
RedHub backend -> gateway -> WhatsApp untuk text/PDF serta reminder H-1 yang **dipicu oleh RedHub backend**.

## 12. Current Position

**LAST PASS / LOCKED:** WA-006 — Minimal Delivery Log & Error Contract  
**IN PROGRESS:** none  
**NEXT:** WA-007 — Security Gate  
**PRODUCTION:** belum  
**TARGET VPS:** 202.10.36.74

## 13. Handoff Rule

Saat chat baru:
1. baca START HERE;
2. baca Master Handoff;
3. baca Checkpoints;
4. baca Decisions;
5. baca API Contract;
6. cek branch/HEAD;
7. lanjut dari checkpoint IN PROGRESS/NEXT;
8. jangan mengulang PASS/LOCKED tanpa regression.
