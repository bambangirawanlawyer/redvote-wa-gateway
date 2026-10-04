# REDHUB WA Gateway — START HERE

Gunakan file ini setiap kali pekerjaan dilanjutkan dari chat/account baru.

## Project Identity

Project yang sedang dikerjakan adalah:

**REDHUB WA GATEWAY**

Tujuan:
membangun gateway WhatsApp mandiri khusus pengiriman undangan RedHub agar tidak bergantung pada Fonnte.

## Important Repository Warning

Repository saat ini bernama:

`bambangirawanlawyer/redvote-wa-gateway`

Repository tersebut sudah memiliki project/dokumentasi **REDVOTE WA Gateway** yang lebih lama.

JANGAN:
- menganggap dokumen REDVOTE sebagai requirement RedHub WA Gateway;
- overwrite `docs/MASTER_HANDOFF.md`, `docs/CHECKPOINTS.md`, atau `docs/DECISIONS.md` REDVOTE;
- mencampur checkpoint REDVOTE `CP-xxx` dengan checkpoint RedHub `WA-xxx`.

Untuk project RedHub WA Gateway, source of truth hanya file dengan prefix:

- `docs/REDHUB_WA_GATEWAY_MASTER_HANDOFF.md`
- `docs/REDHUB_WA_GATEWAY_CHECKPOINTS.md`
- `docs/REDHUB_WA_GATEWAY_DECISIONS.md`
- `docs/REDHUB_WA_GATEWAY_API_CONTRACT.md`
- file ini.

Jika repository dedicated `redhub-wa-gateway` dibuat kemudian, pindahkan dokumen/kode RedHub Gateway ke repository tersebut dan catat migration handoff.

## Mandatory Read Order

Sebelum mengerjakan kode:

1. baca `REDHUB_WA_GATEWAY_MASTER_HANDOFF.md`;
2. baca `REDHUB_WA_GATEWAY_CHECKPOINTS.md`;
3. baca `REDHUB_WA_GATEWAY_DECISIONS.md`;
4. baca `REDHUB_WA_GATEWAY_API_CONTRACT.md`;
5. cek commit terakhir dan working tree;
6. lanjut hanya dari checkpoint NEXT.

## Current State

- Last checkpoint: **WA-000 — PASS / LOCKED**
- Current checkpoint: **WA-001 — Local Docker Foundation**
- Production deploy: **belum**
- RedHub backend integration: **belum, sengaja ditunda**
- Production target VPS: **202.10.36.74**
- Pilot tenant: **Jember**
- Pilot WhatsApp device: **1 nomor**
- Provider V1: **Baileys**
- Local development: **Docker Compose**
- Queue/persistence: **PostgreSQL**
- Redis: **tidak diperlukan pada V1**
- PDF: **wajib dikirim sebagai document attachment**
- Multi-tenant future default: **1 kabupaten = 1 nomor WA**

## Non-Negotiable Workflow

```text
implement
  -> test
  -> PASS
  -> commit
  -> update checkpoint
  -> LOCK
  -> next checkpoint
```

Jangan melakukan beberapa checkpoint sekaligus tanpa verification.

## Scope Reminder

V1 hanya:
- pairing/session;
- outbound invitation;
- personalized template;
- PDF attachment;
- queue;
- retry;
- anti duplicate;
- logs;
- multi-tenant/device foundation;
- security;
- production deployment.

Bukan:
- chatbot;
- inbox;
- AI;
- CRM;
- campaign marketing;
- auto reply;
- public WhatsApp SaaS.

## Next Action

Kerjakan hanya:

**WA-001 — Local Docker Foundation**

Jangan pairing WhatsApp, deploy VPS, atau mengubah backend RedHub sebelum acceptance criteria checkpoint yang relevan terpenuhi.
