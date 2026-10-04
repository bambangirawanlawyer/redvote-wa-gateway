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
