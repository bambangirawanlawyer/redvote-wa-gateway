# REDHUB WA Gateway — Decisions

> Keputusan arsitektur proyek RedHub WA Gateway. Prefix keputusan: RHWA-D.

## RHWA-D-001 — Source of Truth
GitHub menjadi source of truth untuk kode, keputusan, checkpoint, API contract, dan handoff.

Memory chat bukan source of truth. Chat baru harus membaca dokumentasi repository terlebih dahulu.

## RHWA-D-002 — Separate Service
WhatsApp Gateway dibangun sebagai service terpisah dari backend utama RedHub.

Tidak boleh menanam Baileys langsung ke modul meeting/attendance RedHub.

Tujuan:
- failure isolation;
- maintenance lebih mudah;
- provider dapat diganti;
- RedHub tetap stabil saat gateway reconnect/crash.

## RHWA-D-003 — Gateway First, RedHub Later
Gateway diselesaikan sampai production-ready terlebih dahulu.

Backend RedHub baru diintegrasikan setelah checkpoint WA-010 PASS / LOCKED.

## RHWA-D-004 — Local Docker First
Development dan functional validation dilakukan di local menggunakan Docker Compose sebelum deploy VPS.

Production packaging harus sedekat mungkin dengan local packaging.

## RHWA-D-005 — Runtime Stack
Baseline V1:
- Node.js;
- TypeScript;
- Fastify;
- PostgreSQL;
- Docker / Docker Compose.

Redis/RabbitMQ tidak diperlukan pada V1.

## RHWA-D-006 — WhatsApp Provider
Baileys digunakan sebagai WhatsApp engine/provider adapter V1.

Baileys adalah integrasi non-resmi berbasis WhatsApp Web ecosystem. Gateway harus dirancang agar future Meta WhatsApp Cloud API dapat menjadi adapter lain tanpa mengubah business logic RedHub.

## RHWA-D-007 — No Fonnte Dependency
Pengiriman undangan RedHub V1 tidak bergantung pada Fonnte.

Fonnte tidak berada dalam jalur normal:
`RedHub -> Gateway -> WhatsApp`.

## RHWA-D-008 — V1 Use Case
V1 hanya untuk undangan rapat/kegiatan anggota internal RedHub.

Bukan:
- campaign platform;
- mass marketing;
- public messaging API;
- CRM;
- chatbot;
- inbox.

## RHWA-D-009 — Outbound Only
Gateway V1 hanya menangani outbound notification.

Inbound chat/media processing berada di luar scope.

## RHWA-D-010 — Official PDF Attachment
Undangan resmi PDF dikirim sebagai WhatsApp document attachment.

URL PDF hanya boleh menjadi sumber file untuk gateway, bukan pengganti lampiran yang diterima anggota.

## RHWA-D-011 — Invitation Template Baseline
Template baseline mengikuti format yang sudah disepakati di Master Handoff.

Field dinamis minimum:
- recipient name;
- agenda;
- date;
- time;
- location;
- organization/footer per tenant.

Pilot memakai:
`Sekretariat DPC PDI Perjuangan Kabupaten Jember`.

Footer tenant tidak boleh hard-coded permanen pada core untuk skala multi-kabupaten.

## RHWA-D-012 — Queue Persistence
Queue menggunakan PostgreSQL.

Job harus survive process/container restart.

Redis tidak diperlukan pada V1.

## RHWA-D-013 — Idempotency
Setiap logical invitation wajib memiliki idempotency key.

Baseline:
`tenant_id + meeting_id + member_id + invitation_type`.

Tujuan utama: mencegah undangan ganda akibat retry, klik ulang, request timeout, atau worker restart.

## RHWA-D-014 — Retry
Retry hanya untuk reliability.

Retry:
- terbatas;
- tercatat;
- tidak boleh menghasilkan duplicate;
- tidak boleh digunakan sebagai mekanisme untuk mengakali WhatsApp enforcement.

## RHWA-D-015 — Multi-Tenant Direction
RedHub future architecture adalah multi-tenant/multi-kabupaten.

Default:
**1 tenant/kabupaten = 1 nomor WhatsApp sendiri.**

Alasan:
- identitas lokal;
- failure isolation;
- volume isolation;
- ownership jelas.

## RHWA-D-016 — Multi-Device Ready
V1 pilot hanya satu device untuk Jember.

Schema dan API tidak boleh menutup kemungkinan:
- tenant mempunyai lebih dari satu device;
- device default;
- device backup;
- future sharding gateway.

## RHWA-D-017 — Tenant Isolation
Semua device, queue, message log, attempt, dan credential ownership harus dapat dilacak ke tenant.

Tenant A tidak boleh menggunakan device/data tenant B.

## RHWA-D-018 — Session Persistence
WhatsApp auth/session tidak disimpan hanya di writable layer container.

Gunakan persistent volume/mount.

Session tidak boleh masuk Git.

## RHWA-D-019 — PDF Storage
Gateway tidak menjadi permanent document archive.

PDF dapat:
- diambil dari `pdfUrl`;
- digunakan sebagai temporary buffer/file;
- dikirim;
- temporary copy dibersihkan.

Permanent source tetap dimiliki RedHub/storage sumber.

## RHWA-D-020 — Storage Budget
Untuk V1 satu nomor dan media inbound disabled, alokasi operasional gateway sekitar 3–5 GB sudah memadai.

Disk growth harus dijaga melalui:
- log rotation;
- temp cleanup;
- no inbound media archive;
- backup retention discipline.

## RHWA-D-021 — Production VPS
Production target awal:
`202.10.36.74`.

Baseline:
- Ubuntu 24.04 LTS;
- 2 vCPU;
- 3.8 GiB RAM;
- 80 GB disk;
- ~73 GB free saat inspeksi;
- 256 MB swap saat inspeksi.

Swap direncanakan dinaikkan sekitar 2 GB sebelum production workload penuh.

## RHWA-D-022 — Coexistence
Gateway boleh berada pada VPS yang sama dengan RedHub dan RedVote GIS selama resource monitoring sehat.

Gateway harus dipisahkan secara process/container dan network.

## RHWA-D-023 — Internal API Security
API send bukan public anonymous API.

Gunakan internal authentication.

Jika RedHub dan gateway co-located:
- private Docker network atau localhost lebih diprioritaskan.

Endpoint administratif yang diekspos harus melalui HTTPS + auth.

## RHWA-D-024 — Secrets
Dilarang commit:
- `.env`;
- WhatsApp session/auth files;
- database password;
- API token;
- encryption key;
- private credential.

Repository hanya menyimpan template/example tanpa nilai rahasia.

## RHWA-D-025 — Logging
Log harus cukup untuk audit delivery tetapi tidak membocorkan credential.

Log minimum:
- tenant;
- message/job ID;
- member/reference ID;
- status;
- attempt;
- provider message ID;
- timestamp;
- safe error code.

Phone number pada UI/admin log harus dapat dimasking.

## RHWA-D-026 — No Chromium Baseline
V1 tidak memakai Chromium/Puppeteer.

Tujuan: menjaga RAM/CPU rendah.

Jika Baileys tidak memenuhi acceptance criteria, perubahan engine harus menjadi decision baru dan bukan perubahan diam-diam.

## RHWA-D-027 — No Premature Scale Complexity
V1 tidak membutuhkan:
- Kubernetes;
- Redis cluster;
- RabbitMQ;
- multiple worker nodes;
- load balancer;
- distributed session store.

Scale only after real metrics demand it.

## RHWA-D-028 — Checkpoint Discipline
Setiap tahap wajib:
1. implement;
2. test;
3. record evidence;
4. commit;
5. update checkpoint;
6. baru lanjut.

PASS/LOCKED tidak boleh diklaim tanpa verifikasi.

## RHWA-D-029 — RedHub Integration Boundary
Ketika integrasi dimulai, RedHub backend hanya mengirim data bisnis/job melalui contract gateway.

RedHub frontend tidak boleh memanggil gateway send endpoint secara langsung.

## RHWA-D-030 — Failure Isolation
Masalah gateway WhatsApp tidak boleh membuat:
- meeting RedHub gagal dibuat;
- attendance RedHub berhenti;
- RedVote GIS terganggu.

WhatsApp delivery adalah subsystem terisolasi dengan status asynchronous.

## RHWA-D-031 — Delivery Semantics
Respons create-job berarti job diterima gateway, bukan menjamin WhatsApp sudah terkirim.

Delivery status harus dibaca dari message/job status.

## RHWA-D-032 — Scope Change
Setiap permintaan fitur di luar V1 harus dievaluasi sebelum coding.

Jika tidak diperlukan untuk:
- pairing;
- invitation text;
- PDF;
- queue;
- retry;
- idempotency;
- logs;
- tenant/device foundation;
- security;
maka default-nya ditunda.


## RHWA-D-033 — Dedicated RedHub Gateway Port
RedHub WA Gateway uses port **3410** as the local/private service baseline.

Reason:
- existing REDVOTE WA Gateway historically reserves/plans port 3400;
- RedHub gateway is isolated and must not collide with the REDVOTE service;
- production exposure, if needed, should occur through private networking or reverse proxy rather than opening 3410 broadly.

## RHWA-D-034 — WA-001 Reproducibility Evidence
WA-001 foundation may be locked using an isolated Docker CI runner when it validates the same Docker Compose build/start/health/migration/restart behavior without touching production.

For WA-002 and later checkpoints that require a real WhatsApp account/QR/session, real device validation is mandatory and CI simulation is not a substitute.


## RHWA-D-035 — WA-002 Baileys Version Pin
WA-002 uses `baileys@7.0.0-rc14` as the initial pinned provider version because the repository already had compatibility with this API shape.

Do not silently upgrade the provider version during the pairing checkpoint. Upgrade only after regression tests and a recorded decision.

## RHWA-D-036 — Protected QR Access
QR pairing data is sensitive short-lived operational state.

Rules:
- no QR in normal application logs;
- JSON QR endpoint requires internal bearer auth;
- PNG QR endpoint requires internal bearer auth;
- QR endpoint is for pairing only and returns 404 when no active QR exists;
- production UI integration is deferred; WA-002 testing may save the authenticated PNG response locally for scanning.


---

# Scope Revision — 2026-10-05

Keputusan berikut dibuat berdasarkan instruksi eksplisit user dan **menggantikan bagian keputusan lama yang bertentangan**, tanpa menghapus histori.

## RHWA-D-037 — RedHub Backend Owns Broadcast and Reminder
Backend RedHub adalah pemilik business orchestration untuk:
- broadcast;
- reminder H-1;
- scheduling;
- recipient selection/segmentation;
- meeting/event business data;
- keputusan re-send/retry bisnis;
- business duplicate prevention.

WA Gateway tidak mengimplementasikan ulang fungsi-fungsi tersebut.

## RHWA-D-038 — Gateway Is a Simple Multi-Tenant Delivery Layer
V1 WA Gateway disederhanakan menjadi:
```text
RedHub Backend -> Internal WA Gateway API -> Tenant WhatsApp Session -> WhatsApp
```

Gateway hanya menangani:
- tenant/device resolution;
- session lifecycle;
- persistent auth/session;
- reconnect;
- text delivery;
- PDF/document delivery;
- provider result/error;
- minimal delivery log/audit;
- security and tenant isolation.

## RHWA-D-039 — Supersede Gateway Campaign Queue / Business Retry Engine
Keputusan lama yang mewajibkan gateway-side persistent campaign queue, business retry orchestration, dan business idempotency engine **SUPERSEDED untuk V1**.

Secara khusus, bagian RHWA-D-012, RHWA-D-013, dan RHWA-D-014 yang menempatkan tanggung jawab tersebut di gateway tidak lagi menjadi requirement V1.

PostgreSQL yang sudah ada dari WA-001 tetap boleh dipakai untuk:
- tenant/device metadata;
- minimal delivery log;
- operational metadata.

PostgreSQL tidak wajib menjadi campaign scheduler/queue.

## RHWA-D-040 — Delivery API, Not Invitation Business API
API utama V1 memakai generic delivery contract:
- `POST /api/v1/messages/text`
- `POST /api/v1/messages/document`

Gateway menerima payload yang sudah siap dikirim dari backend.

Gateway tidak merender business invitation dari meeting/member data dan tidak menentukan kapan recipient menerima reminder.

## RHWA-D-041 — Local-First Remains Mandatory
Walaupun gateway disederhanakan, development tetap:
```text
local Docker -> real functional test -> PASS/LOCKED -> VPS deploy
```

Production target:
`202.10.36.74`

VPS lama:
`202.10.45.147`
tidak disentuh kecuali user memberi instruksi eksplisit.

## RHWA-D-042 — Multi-Tenant Session Isolation Remains Mandatory
Penyederhanaan scope tidak menghapus requirement multi-tenant.

Minimal:
- setiap tenant punya ownership device/session;
- tenant A tidak dapat memakai tenant B device/session;
- baseline satu default device per tenant;
- future multi-device tetap dimungkinkan.

## RHWA-D-043 — Checkpoint per Successful Stage
Setiap tahap pekerjaan wajib:
1. implement;
2. test;
3. catat evidence;
4. commit;
5. update checkpoint;
6. tandai PASS / LOCKED jika seluruh acceptance criteria lulus;
7. baru lanjut tahap berikutnya.

Tidak boleh menggabungkan beberapa tahap sebagai PASS tanpa evidence masing-masing.


## RHWA-D-044 — Tenant-Scoped Session Identity
WA-005 locks WhatsApp runtime/session identity to the composite:

`tenantId + deviceId`

Persistent session layout:

```text
SESSION_DIR/<tenantId>/<deviceId>/
```

Consequences:
- the same device ID may exist under different tenants without collision;
- all tenant-scoped status/pairing/send lookups must resolve ownership;
- tenant A must not use tenant B session/device.

## RHWA-D-045 — Single-Device Tenant Is the V1 Implicit Default
To keep the delivery API simple:
- when a tenant has exactly one runtime device, `deviceId` may be omitted for text/PDF delivery;
- when a tenant has more than one runtime device, `deviceId` becomes mandatory;
- omission with multiple devices returns `DEVICE_REQUIRED`.

This gives V1 a simple default-device behavior without adding a separate default-device database table.

## RHWA-D-046 — Persisted Tenant Sessions Restore on Startup
Gateway startup discovers tenant/device session directories containing credentials and starts them automatically.

The previous WA-002 single-level session layout is migrated once to the tenant/device layout using configured legacy/default tenant and device IDs.

Migration must preserve the paired session and must not force a new QR.

## RHWA-D-047 — No Tenant-Specific Core Defaults
Core configuration must not permanently default to Jember or any organization.

`DEFAULT_TENANT_ID` and `DEFAULT_DEVICE_ID` must be provided by environment/configuration for a deployment.

Jember remains only the first pilot configuration, not a core architecture assumption.

## RHWA-D-048 — Minimal Delivery Audit Is Not a Queue
WA-006 persists only operational delivery audit records.

Stored fields are limited to:
- correlation/request ID;
- tenant/device;
- message type;
- masked destination;
- provider message ID;
- SENT/FAILED;
- safe error code/message;
- timestamp.

The audit table is not a campaign queue, scheduler, business retry engine, or business idempotency source.

## RHWA-D-049 — Never Persist Raw Destination in Delivery Audit
The operational audit schema stores `destination_masked` only.

A raw phone/destination column is intentionally absent from `delivery_logs`.

Application logs must also avoid printing message destination.

## RHWA-D-050 — Audit Failure Must Not Cause Duplicate Delivery
If WhatsApp delivery succeeds but writing the audit record fails, the API delivery response remains successful.

Reason:
turning the response into failure after a successful WhatsApp send could cause RedHub to retry and duplicate the message.

Audit persistence failure is logged safely without destination or credential data.


## RHWA-D-051 — Document Fetch Is SSRF-Protected by Default
WA-007 locks document source policy as follows:
- non-allowlisted/public sources require HTTPS;
- URL credentials are rejected;
- localhost/private/reserved IP targets are rejected;
- DNS results for non-allowlisted hosts must not resolve to private/reserved addresses;
- redirects are followed manually and every redirect target is revalidated;
- redirect count is bounded.

Internal/private HTTP is allowed only when the exact hostname is explicitly configured in `DOCUMENT_ALLOWED_HOSTS`.

This keeps the gateway simple while preventing arbitrary document URLs from becoming access to local metadata/services.

## RHWA-D-052 — Runtime Secrets Have No Weak Compose Defaults
Production/runtime-critical values must be supplied explicitly.

Locked rules:
- `API_TOKEN_SECRET` is required and must be at least 32 characters;
- placeholder API token values are rejected;
- Compose must not fall back to a built-in API token or PostgreSQL password;
- deployment tenant/device IDs must be supplied explicitly rather than defaulting core architecture to Jember.

## RHWA-D-053 — WhatsApp Session Credentials Use Restricted Permissions
Persistent WhatsApp session storage is sensitive credential material.

Locked permissions:
- session root / tenant / device directories: `700`;
- credential/key files: `600`;
- gateway container process runs as non-root `app` user.

Permission hardening is applied at startup and after credential/message state changes.

## RHWA-D-054 — Internal API Logs Must Not Expose Authorization
Gateway logger configuration redacts `req.headers.authorization`.

The existing Baileys/libsignal sensitive-session logging suppression remains mandatory.

Local security verification must include a marker-based log scan before WA-007 can be locked.


## RHWA-D-055 — WA-008 Requires the Actual RedHub Backend
A gateway-side mock, smoke script, or synthetic client is useful for contract preparation but is **not sufficient** to mark WA-008 PASS / LOCKED.

WA-008 exit requires access to the actual RedHub backend source/runtime and verification that:
- the backend calls text delivery;
- the backend calls PDF/document delivery;
- tenant/device mapping is wired correctly;
- gateway success/error is consumed by backend logic;
- broadcast orchestration remains in RedHub;
- reminder H-1 remains triggered by RedHub.

Until that source/runtime is accessible, WA-008 is BLOCKED and WA-009 production deployment must not start.


## RHWA-D-056 — Standalone Production Deployment May Proceed While WA-008 Is Deferred
On 2026-10-05 the user explicitly approved continuing WA Gateway deployment even though the actual RedHub backend repository/runtime could not be found.

Locked interpretation:
- WA-008 remains **DEFERRED / EXTERNAL DEPENDENCY** and is not PASS;
- WA-009 standalone gateway production deployment may proceed;
- WA-009 validates the gateway itself, session persistence, networking, security, backup and direct text/PDF delivery;
- WA-010 production end-to-end remains blocked until the actual RedHub backend is integrated;
- the old VPS `202.10.45.147` must not be touched;
- the WA-009 target is `202.10.36.74`.
