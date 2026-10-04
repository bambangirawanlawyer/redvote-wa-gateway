# REDHUB WA Gateway — Master Handoff

> Status dokumen: ACTIVE SOURCE-OF-TRUTH HANDOFF untuk proyek **RedHub WA Gateway**.
>
> Catatan repository: repository ini juga memiliki dokumen REDVOTE WA Gateway yang lebih lama. Dokumen dengan prefix `REDHUB_WA_GATEWAY_` adalah namespace terpisah dan **tidak mengubah keputusan REDVOTE WA Gateway lama**. Jika nanti dibuat repository khusus `redhub-wa-gateway`, seluruh dokumen ini harus dipindahkan tanpa mengubah history keputusan.

## 1. Tujuan Proyek

Membangun WhatsApp Gateway mandiri untuk RedHub agar pengiriman undangan rapat/kegiatan anggota **tidak bergantung pada Fonnte**.

Gateway V1 bukan platform broadcast umum dan bukan pengganti penuh Fonnte. Fungsi utamanya hanya:

- menghubungkan nomor WhatsApp RedHub;
- menerima job undangan dari sistem;
- mengirim pesan undangan terpersonalisasi;
- mengirim **lampiran PDF undangan resmi**;
- mengelola antrean, retry, anti-duplikasi, status, dan log;
- menjaga session WhatsApp tetap persisten setelah restart;
- siap dikembangkan menjadi multi-tenant/multi-kabupaten.

Pilot pertama: **RedHub Kabupaten Jember**.

## 2. Prinsip Kerja

1. GitHub adalah source of truth dokumentasi dan kode.
2. Setiap tahap hanya dinyatakan selesai setelah acceptance criteria diuji.
3. Setiap tahap yang lulus dicatat **PASS / LOCKED**.
4. Jangan mengubah keputusan LOCKED tanpa instruksi eksplisit.
5. Bangun dan uji di **local Docker terlebih dahulu**.
6. Deploy ke VPS hanya setelah gateway lokal stabil.
7. Integrasi ke backend RedHub dilakukan **setelah gateway selesai dan production-ready**.
8. Scope V1 harus tetap kecil dan wajib saja; jangan membangun CRM/chatbot/inbox/broadcast marketing.
9. Session, token, secret, password, dan credential WhatsApp **tidak boleh masuk Git**.
10. Reliability controls tidak boleh digunakan untuk mengakali pembatasan/enforcement WhatsApp.

## 3. Arsitektur Target

### Fase pembangunan gateway

```text
Test Client / curl / Postman
          |
          v
REDHUB WA GATEWAY
  |-- REST API
  |-- Tenant/Device Manager
  |-- WhatsApp Provider Adapter
  |     `-- Baileys V1
  |-- Persistent Session
  |-- Invitation Renderer
  |-- PDF Sender
  |-- PostgreSQL Queue
  |-- Retry / Idempotency
  `-- Delivery Log
          |
          v
       WhatsApp
```

### Setelah integrasi RedHub

```text
Flutter RedHub
      |
      v
RedHub Backend
      |
      | internal authenticated API
      v
RedHub WA Gateway
      |
      v
Provider Adapter
      |
      v
Baileys / WhatsApp
```

RedHub tidak boleh memanggil Baileys secara langsung.

## 4. Provider Abstraction

Gateway wajib memakai adapter:

```text
RedHub -> Gateway API -> Provider Adapter -> WhatsApp Engine
```

Provider V1:

- **Baileys**

Future provider yang harus tetap memungkinkan tanpa membongkar RedHub:

- Meta WhatsApp Cloud API

Tujuan abstraction ini adalah menjaga RedHub tidak terikat langsung pada satu engine.

## 5. Scope V1 — LOCKED

### Wajib

- 1 nomor WhatsApp pada pilot Jember.
- Pairing QR / pairing state.
- Persistent authentication/session.
- Automatic reconnect setelah restart/koneksi putus.
- Outbound only.
- Pesan undangan terpersonalisasi.
- Lampiran PDF undangan resmi.
- Nama file PDF yang manusiawi.
- PostgreSQL-backed queue.
- Controlled sending.
- Retry terbatas.
- Idempotency / anti duplicate.
- Delivery log.
- Status message.
- Health endpoint.
- Internal API authentication.
- Multi-tenant-ready data model.
- Multi-device-ready data model walaupun pilot hanya 1 device.
- Docker untuk local development dan production packaging.
- Persistent volume untuk WhatsApp session.

### Di luar V1

- Inbox WhatsApp.
- Chatbot.
- AI/LLM.
- Auto reply.
- CRM.
- Campaign builder.
- Marketing blast.
- Scraping nomor.
- Penyimpanan inbound media.
- Multi-number load balancing otomatis.
- Billing SaaS.
- Public self-service tenant onboarding.
- Fitur untuk menghindari pembatasan WhatsApp.

## 6. Template Pesan Undangan — LOCKED BASELINE

Template baseline yang harus didukung:

```text
*UNDANGAN RAPAT / KEGIATAN*

Yth. *Bpk/Ibu {{recipient_name}}*,

*Merdeka...!!*

Dengan hormat, kami menyampaikan undangan untuk menghadiri agenda berikut:

*📌 Agenda: {{agenda}}*
*📅 Waktu: {{date}}*
*⏰ Pukul: {{time}} WIB*
*📍 Tempat: {{location}}*

Undangan resmi terlampir pada pesan ini.

Mohon hadir tepat waktu sesuai jadwal yang telah ditetapkan.

Terima kasih atas perhatian dan kehadirannya.

*Merdeka...!!*

*Sekretariat DPC PDI Perjuangan Kabupaten Jember*

_Pesan otomatis RedHub. Mohon tidak membalas pesan ini. Untuk informasi lebih lanjut, hubungi Sekretariat._
```

Untuk multi-tenant, identitas/footer organisasi tidak boleh hard-coded permanen ke Jember. Pilot memakai Jember; future tenant harus dapat memiliki identitas sendiri.

## 7. Lampiran PDF — LOCKED

- PDF dikirim sebagai **document attachment WhatsApp**, bukan hanya URL yang ditampilkan kepada penerima.
- Gateway boleh menerima `pdfUrl` dari RedHub/test client sebagai sumber file.
- File dapat diambil sementara ke memory/temp storage lalu dikirim.
- Gateway tidak perlu menyimpan copy permanen jika file sudah dimiliki RedHub/storage sumber.
- Temp file harus dibersihkan setelah selesai.
- Nama file harus manusiawi, contoh:
  `Undangan_TEST_UPACARA_13_Oktober_2026.pdf`
- Untuk satu kegiatan dengan PDF yang sama, jangan membuat copy permanen per penerima.
- V1 tidak menyimpan foto/video/audio inbound.

## 8. Multi-Tenant Direction — LOCKED

RedHub diarahkan menjadi multi-tenant/multi-kabupaten.

Default arsitektur:

**1 tenant/kabupaten = 1 nomor WhatsApp sendiri.**

Contoh:

```text
RedHub Platform
|-- Tenant Jember       -> WA Jember
|-- Tenant Banyuwangi   -> WA Banyuwangi
|-- Tenant Bondowoso    -> WA Bondowoso
`-- Tenant Lumajang     -> WA Lumajang
```

Alasan:

- identitas lokal lebih jelas;
- kegagalan/session problem terisolasi per tenant;
- volume pesan tidak bercampur;
- tenant dapat mengelola device sendiri;
- satu nomor bermasalah tidak mematikan semua kabupaten.

Data model harus mendukung:

- satu tenant memiliki satu default device pada V1;
- future: satu tenant dapat memiliki lebih dari satu device;
- semua queue/log/session ownership membawa `tenant_id`.

Pilot tetap hanya Jember + 1 nomor.

## 9. Queue dan Status

Baseline state machine:

```text
PENDING
  -> PREPARING
  -> SENDING
  -> SENT
```

Failure path:

```text
SENDING
  -> FAILED
  -> RETRY_PENDING
  -> SENDING
  -> SENT | FAILED_FINAL
```

Ketentuan:

- retry terbatas dan tercatat;
- restart worker tidak boleh kehilangan job;
- job tidak boleh terkirim dua kali karena user menekan tombol ulang;
- idempotency wajib.

Baseline idempotency key:

```text
tenant_id + meeting_id + member_id + invitation_type
```

## 10. Data Model Baseline

### wa_tenants
- id
- code
- name
- status
- created_at
- updated_at

### wa_devices
- id
- tenant_id
- device_name
- phone
- provider
- status
- is_default
- last_connected_at
- created_at
- updated_at

### wa_messages
- id
- tenant_id
- device_id
- meeting_id
- member_id
- destination_phone
- recipient_name
- message_type
- message_text
- pdf_source_url
- pdf_filename
- idempotency_key
- status
- attempt_count
- provider_message_id
- last_error_code
- last_error_message
- queued_at
- sent_at
- created_at
- updated_at

### wa_message_attempts
- id
- message_id
- attempt_no
- started_at
- finished_at
- status
- provider_message_id
- error_code
- error_message

Catatan: struktur final migration dapat disesuaikan saat implementasi, tetapi isolasi `tenant_id`, device ownership, message persistence, attempt history, dan idempotency adalah requirement tetap.

## 11. API Contract Baseline

Endpoint detail berada di `docs/REDHUB_WA_GATEWAY_API_CONTRACT.md`.

Minimal capability:

- `GET /health`
- device/session status;
- start/restart pairing;
- QR/pairing state;
- create invitation job;
- message status;
- queue summary;
- test send.

Semua endpoint selain health internal harus memakai autentikasi.

## 12. Security Baseline

- `.env` tidak masuk Git.
- Session WhatsApp tidak masuk Git.
- API key/token tidak masuk Git.
- DB password tidak masuk Git.
- File session disimpan di persistent volume dengan permission ketat.
- Production gateway tidak dibuka bebas ke internet.
- Jika RedHub backend dan gateway berada pada VPS yang sama, gunakan private Docker network/localhost.
- Jika endpoint administratif perlu diekspos, wajib melalui Nginx/HTTPS + authentication.
- Validasi nomor tujuan.
- Validasi URL/file PDF.
- Batasi ukuran PDF pada implementasi.
- Sanitasi nama file.
- Jangan log secret/session credential.
- Nomor telepon pada log UI harus dapat dimasking.
- Tidak ada endpoint arbitrary-send publik tanpa authorization.

## 13. Local-First Development — LOCKED

Gateway dibangun terlebih dahulu di local PC menggunakan Docker.

Target local stack:

```text
docker compose
|-- gateway
|-- postgres
`-- persistent whatsapp-session volume
```

Tidak perlu Redis pada V1. Queue memakai PostgreSQL.

Local acceptance sebelum deploy:

- build berhasil;
- health pass;
- DB migration pass;
- pairing pass;
- session survive restart;
- text send pass;
- PDF send pass;
- queue pass;
- retry pass;
- anti-duplicate pass;
- restart recovery pass;
- batch test pass.

## 14. Production Target VPS

VPS baru:

- IP: `202.10.36.74`
- OS: Ubuntu 24.04 LTS
- Virtualization: KVM
- CPU: 2 vCPU Intel Xeon Gold 6138 @ 2.00GHz
- RAM: 3.8 GiB
- RAM available saat baseline: sekitar 3.4 GiB
- Disk: 80 GB
- Disk available saat baseline: sekitar 73 GB
- Swap: 256 MB
- Docker: belum terinstall saat baseline
- Port publik saat baseline: SSH/22
- Load baseline: 0.00

### Production preparation

Sebelum menjalankan RedHub + RedVote GIS + WA Gateway secara production:

- tingkatkan swap dari 256 MB menjadi sekitar 2 GB sebagai safety buffer;
- install Docker/Compose;
- pasang firewall;
- gunakan Nginx/HTTPS bila diperlukan;
- buat backup session/config/database;
- aktifkan monitoring dasar;
- beri resource limit container setelah baseline usage diketahui.

## 15. Resource Budget WA Gateway

Untuk scope V1 satu nomor dan volume rendah:

- RAM idle/normal target: sekitar 100–400 MB bergantung library/runtime;
- storage aplikasi/session/log operasional: alokasi nyaman **3–5 GB**;
- tidak perlu 20 GB jika media inbound tidak disimpan;
- PDF sumber tidak diduplikasi permanen oleh gateway.

VPS 2 vCPU / 3.8 GiB / 80 GB masih layak untuk RedHub + RedVote GIS + satu WA Gateway ringan, dengan monitoring resource.

## 16. Volume Awal

Kebutuhan awal RedHub:

- internal organisasi;
- bukan kampanye;
- bukan pengiriman ke nomor tidak dikenal;
- batch tipikal sekitar 100–200 undangan;
- total awal sekitar <=500 pesan/bulan;
- satu nomor pilot Jember.

Tidak perlu optimasi skala besar pada V1.

## 17. Tahapan Pembangunan

### WA-000 — Architecture & Contract
Status: **PASS / LOCKED**

Output:
- scope;
- architecture;
- multi-tenant direction;
- provider abstraction;
- PDF requirement;
- queue/idempotency;
- local-first;
- production target;
- API baseline.

### WA-001 — Local Docker Foundation
Status: **PASS / LOCKED**

Verified on 2026-10-04 via GitHub Actions Docker runner:
- typecheck/test/build PASS;
- Docker Compose build/start PASS;
- PostgreSQL + migration PASS;
- health PASS;
- restart persistence smoke PASS.

Implementation directory: `redhub-gateway/`.
Service port baseline: `3410`.

Target:
- repository/service skeleton;
- Node.js + TypeScript + Fastify;
- Dockerfile;
- docker-compose;
- PostgreSQL;
- migration foundation;
- `.env.example`;
- `GET /health`;
- tests/build.

### WA-002 — WhatsApp Device & Persistent Session
Status: **NEXT**

- Baileys adapter;
- QR pairing;
- session persistence;
- reconnect;
- status.

### WA-003 — Basic Sending
- normalized phone handling;
- test text send;
- provider message ID;
- status/log.

### WA-004 — PDF Invitation
- template rendering;
- document attachment;
- filename;
- temp cleanup;
- test real PDF.

### WA-005 — Queue Engine
- PostgreSQL queue;
- worker;
- controlled processing;
- restart recovery.

### WA-006 — Reliability
- retry;
- backoff;
- idempotency;
- duplicate prevention;
- attempt audit.

### WA-007 — Multi-Tenant Foundation
- tenant ownership;
- device per tenant;
- isolation tests;
- future multi-device readiness.

### WA-008 — Security & Audit
- internal API authentication;
- validation;
- masking;
- audit log;
- secret/session review.

### WA-009 — Production Deployment
- VPS `202.10.36.74`;
- Docker;
- persistent volume;
- network isolation;
- HTTPS/reverse proxy as needed;
- backup;
- monitoring.

### WA-010 — End-to-End Validation
Staged test:
- 1 recipient;
- 10 recipients;
- 50 recipients;
- 100 recipients;
- PDF included;
- restart/recovery;
- retry/duplicate checks.

Hanya setelah WA-010 PASS / LOCKED, integrasi RedHub dimulai.

## 18. RedHub Integration — AFTER GATEWAY COMPLETE

Tidak dikerjakan sebelum WA-010 PASS / LOCKED.

### RH-WA-001 — Backend Client
RedHub backend mengirim job ke gateway.

### RH-WA-002 — Device/Admin Integration
Status device dan pairing dihubungkan ke hak akses RedHub.

### RH-WA-003 — Meeting Invitation
Meeting + participants + PDF -> create jobs.

### RH-WA-004 — Delivery Status UI
Admin melihat pending/sent/failed.

### RH-WA-005 — Production Validation
Uji alur dari dashboard RedHub sampai WhatsApp anggota.

## 19. Definition of Done Gateway V1

Gateway V1 dinyatakan COMPLETE hanya jika:

- local Docker reproducible;
- DB migration reproducible;
- pairing bekerja;
- session survive container restart;
- reconnect bekerja;
- text invitation terkirim;
- PDF attachment terkirim;
- queue persistent;
- retry terbatas bekerja;
- idempotency mencegah duplicate;
- delivery log valid;
- tenant/device ownership valid;
- secret tidak ada di Git;
- production deployment sehat;
- staged batch test pass;
- dokumentasi/checkpoint diperbarui.

## 20. Current Position

**LAST CHECKPOINT:** WA-001 — Local Docker Foundation — PASS / LOCKED  
**CURRENT PHASE:** WA-002 — WhatsApp Device & Persistent Session  
**DEPLOYMENT:** Belum dilakukan  
**REDHUB BACKEND INTEGRATION:** Belum dilakukan, sengaja ditunda sampai gateway selesai  
**NEXT ACTION:** implement WA-002 Baileys provider adapter + device/session persistence + protected pairing state, lalu lakukan pairing nyata dengan satu nomor WhatsApp test.

## 21. Aturan Handoff Chat Baru

Saat memulai chat baru:

1. Buka dokumen ini.
2. Buka `REDHUB_WA_GATEWAY_CHECKPOINTS.md`.
3. Buka `REDHUB_WA_GATEWAY_DECISIONS.md`.
4. Buka `REDHUB_WA_GATEWAY_API_CONTRACT.md`.
5. Jangan mengandalkan memory chat sebagai source of truth.
6. Mulai dari checkpoint NEXT pertama.
7. Jangan mengulang checkpoint PASS / LOCKED kecuali ada failure/regression yang terverifikasi.
