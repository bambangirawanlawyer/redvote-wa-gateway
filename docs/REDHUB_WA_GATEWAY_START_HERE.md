# REDHUB WA Gateway — START HERE

Gunakan file ini setiap kali pekerjaan dilanjutkan dari chat/account baru.

## Project Identity

Project: **REDHUB WA GATEWAY**

Tujuan V1:
membangun delivery gateway WhatsApp mandiri untuk RedHub sebagai pengganti Fonnte pada jalur pengiriman pesan.

Gateway **bukan** tempat business logic broadcast/reminder. Backend RedHub sudah memiliki:
- pemilihan penerima;
- broadcast orchestration;
- reminder H-1;
- jadwal pengiriman;
- data rapat/kegiatan;
- template/business context.

Gateway hanya bertugas:
1. menerima request dari backend RedHub;
2. memilih session/device milik tenant;
3. mengirim text atau PDF/document ke WhatsApp;
4. mengembalikan hasil/provider message ID/error;
5. menjaga session WhatsApp multi-tenant tetap persisten;
6. menyimpan log delivery minimum bila diperlukan.

## Repository

Source of truth saat ini:
`bambangirawanlawyer/redvote-wa-gateway`

Dokumen RedHub Gateway hanya file ber-prefix:
- `docs/REDHUB_WA_GATEWAY_MASTER_HANDOFF.md`
- `docs/REDHUB_WA_GATEWAY_CHECKPOINTS.md`
- `docs/REDHUB_WA_GATEWAY_DECISIONS.md`
- `docs/REDHUB_WA_GATEWAY_API_CONTRACT.md`
- file ini.

Jangan overwrite dokumen REDVOTE lama.

## Architecture Lock — 2026-10-05

```text
RedHub Backend
  |-- broadcast logic
  |-- reminder H-1
  |-- recipient selection
  |-- scheduling
  |
  | REST internal API
  v
RedHub WA Gateway
  |-- tenant/device resolver
  |-- Baileys adapter
  |-- persistent WA session
  |-- text sender
  |-- PDF/document sender
  `-- minimal delivery result/log
  |
  v
WhatsApp
```

## Explicitly NOT in Gateway

- campaign builder;
- broadcast scheduler;
- reminder scheduler;
- recipient segmentation;
- meeting business logic;
- queue orchestration for campaign processing;
- business retry policy;
- idempotency/business duplicate rules;
- CRM/chatbot/inbox/AI.

Jika reliability minimum dibutuhkan di gateway, implementasinya harus tetap kecil dan tidak mengambil alih tanggung jawab backend RedHub.

## Multi-Tenant

Gateway tetap multi-tenant.

Baseline:
- satu tenant memiliki satu default WhatsApp device/session;
- future dapat lebih dari satu device;
- session/device tenant A tidak boleh dipakai tenant B;
- pilot pertama: Jember.

## Development Strategy

**LOCAL FIRST — LOCKED**

Bangun dan uji di local Docker terlebih dahulu. Deploy ke VPS hanya setelah:
- pairing/session PASS;
- session survive restart;
- text send PASS;
- PDF/document send PASS;
- tenant isolation PASS;
- auth/security baseline PASS.

Production VPS:
`202.10.36.74`

VPS lama `202.10.45.147` tidak disentuh kecuali ada instruksi eksplisit.

## Current Checkpoint

- WA-000 — historical architecture baseline — PASS / LOCKED
- WA-001 — Local Docker Foundation — PASS / LOCKED
- WA-001A — Scope Simplification: RedHub Owns Broadcast/Reminder — PASS / LOCKED
- WA-002 — WhatsApp Device & Persistent Session — IN PROGRESS
- Production deploy — NOT STARTED

## Mandatory Workflow

```text
implement
  -> test
  -> PASS
  -> commit
  -> update checkpoint evidence
  -> LOCK
  -> next checkpoint
```

Tidak boleh mengklaim PASS tanpa verifikasi.

## Next Action

Selesaikan **WA-002** di local:
- pair satu nomor test;
- status CONNECTED;
- restart container tanpa QR baru;
- reconnect/log hygiene.

Setelah WA-002 PASS / LOCKED, lanjut **WA-003 — Text Delivery API**.
