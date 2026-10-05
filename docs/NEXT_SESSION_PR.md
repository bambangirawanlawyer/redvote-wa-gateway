# WA Gateway — Completion Handoff

**Updated:** 2026-10-06
**Project:** RedHub WA Gateway
**Current checkpoint:** WA-011 — RedHub Device Management & Pairing Integration
**Status:** PASS / LOCKED

## Do Not Repeat

WA-000 through WA-011 are PASS / LOCKED.

Do not:
- touch old VPS `202.10.45.147`;
- unpair/logout/delete production devices without explicit instruction;
- run `docker compose down -v`;
- move broadcast/reminder scheduling into the gateway;
- expose the gateway bearer token to Flutter;
- edit compiled production `main.dart.js` as a replacement for Flutter source.

## Production State

- VPS: `202.10.36.74`
- Gateway: `127.0.0.1:3410`
- Provider: `REDHUB_GATEWAY`
- Current organization broadcast mode: `TEST`
- Tenant: `jember`
- `jember-main` / `6285702459733`: CONNECTED
- `jember-02` / `6285806700300`: CONNECTED
- Default sender: not selected; operator-controlled in RedHub
- Fonnte credential: retained for rollback
- Backend active release: `/opt/redhub-hybrid/releases/20261006-003054`
- Frontend active release: `/var/www/redhub.redvote.id/releases/20261006-010820`

## Locked Components

- RB-004 — Backend Multi-Device Management API: PASS / LOCKED
- UI-018 — WhatsApp Device Management: PASS / LOCKED
- WA-011 — RedHub Device Management & Pairing Integration: PASS / LOCKED

## WA-011 Final Evidence

- Flutter source recovered and verified against production build;
- device list/status UI deployed;
- QR pairing available directly from RedHub;
- existing pairing can be resumed with `Tampilkan QR`;
- default-device action available;
- sender selector available on Undangan & Broadcast;
- second device `jember-02` paired from RedHub and reached CONNECTED;
- controlled TEXT send through `jember-02`: sent 1 / failed 0;
- gateway delivery audit records `jember-02` TEXT and DOCUMENT deliveries as SENT;
- both WhatsApp sessions coexist under tenant `jember`;
- backend, reminder timer, gateway and PostgreSQL healthy.

## Responsibility Boundary

RedHub backend remains the business-logic owner:
- recipient selection;
- meeting invitation business flow;
- TEST/LIVE policy;
- H-1 scheduling;
- selected/default device decision;
- business retry decisions.

WA Gateway remains delivery-only:
- persistent WhatsApp sessions;
- tenant/device isolation;
- QR pairing/status;
- text/PDF delivery;
- minimal delivery audit.

## Next Work

No mandatory WA-011 work remains. Any new capability must start a new checkpoint.
