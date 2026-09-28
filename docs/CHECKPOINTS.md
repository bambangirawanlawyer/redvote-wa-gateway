# REDVOTE WA Gateway — Checkpoints

## CP-001 — Architecture
**Status: PASS / LOCKED**

Decisions:
- Standalone gateway, reusable by multiple REDVOTE applications.
- Node.js/TypeScript backend.
- Baileys WhatsApp engine.
- PostgreSQL persistence.
- Nginx + systemd deployment.
- No Redis, RabbitMQ, Chromium/Puppeteer or Docker required for V1.
- V1 remains intentionally lightweight for the existing 1-vCPU VPS.

## CP-002 — VPS Isolation & Foundation
**Status: PASS / LOCKED**

Verified:
- Ubuntu 24.04 LTS.
- Node.js 24.20.0 and npm 11.19.0.
- PostgreSQL 18.6 on localhost port 5433.
- Nginx active with valid configuration.
- Gateway reserved for `127.0.0.1:3400`.
- Production path planned as `/opt/redvote-wa`.
- systemd service planned as `redvote-wa.service`.
- Dedicated database `redvote_wa` and role `redvote_wa_app`.
- DNS `wa.redvote.id` resolves publicly to the VPS.
- Existing REDVOTE, Kurir Obat and other production services must remain untouched.
- Laundry API intentionally disabled; source and database retained.

## CP-003 — Gateway Foundation & WhatsApp Engine/QR
**Status: NEXT**

Acceptance criteria:
- Project foundation builds successfully.
- Dedicated database connection works.
- Health endpoint responds on localhost port 3400.
- Baileys device session can be created.
- QR/pairing state is exposed securely.
- Session survives service restart.
- No existing production service is interrupted.
