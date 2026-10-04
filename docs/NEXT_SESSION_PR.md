# WA Gateway — Next Session PR

**Paused:** 2026-10-05
**Project:** RedHub WA Gateway
**Status at pause:** WA-008 PASS / LOCKED, WA-009 PASS / LOCKED, WA-010 PENDING

## Do Not Repeat

Do not redo WA-000 through WA-009 unless a regression is found.

Do not:
- touch the old VPS `202.10.45.147`;
- unpair/logout/delete the WhatsApp production session;
- run `docker compose down -v`;
- switch broadcast mode to LIVE before WA-010 exit gates pass;
- remove the Fonnte rollback credential yet.

## Current Production State

- New VPS: `202.10.36.74`
- RedHub backend runtime: `redhub-hybrid.service`
- Backend active release at pause: `/opt/redhub-hybrid/releases/20261005-062918`
- Backend repository: `bambangirawanlawyer/redhub-backend`
- Backend branch: `feat/redhub-wa-gateway-provider`
- Backend checkpoint RB-002: PASS / LOCKED
- WA Gateway repository: `bambangirawanlawyer/redvote-wa-gateway`
- Gateway branch: `feat/redhub-wa-009-vps-deploy`
- Gateway: `127.0.0.1:3410`
- Tenant/device: `jember` / `jember-main`
- WhatsApp: CONNECTED
- Production provider metadata: `REDHUB_GATEWAY`
- Broadcast mode: `TEST`
- Fonnte credential: retained for rollback
- Backend, reminder timer, gateway, PostgreSQL: healthy
- Gateway and backend sensitive-log scans: PASS

## Completed Integration Evidence

- backend adapter -> gateway connection: PASS / CONNECTED;
- backend -> gateway TEXT: SENT;
- backend -> gateway DOCUMENT/PDF: SENT;
- authenticated `broadcastMeetingInvitation` TEST business flow -> gateway -> WhatsApp: PASS;
- business-flow result: HTTP 200 / SENT / sent 1 / failed 0;
- Firestore recorded provider `REDHUB_GATEWAY` and status `SENT`;
- gateway delivery audit recorded the business-flow document as SENT;
- user visually confirmed the RB-002 business-flow invitation/PDF arrived in WhatsApp.

## Remaining Mandatory Stage

### WA-010 — Production End-to-End / Go-Live Gate

Run only the remaining go-live gates:

1. H-1 reminder end-to-end:
   RedHub backend scheduler/business logic -> WA Gateway -> WhatsApp.
2. Verify reminder Firestore/business logs and gateway delivery audit.
3. Verify tenant/device routing and safe error handling.
4. Verify restart/persistence remains healthy after the integrated backend/gateway state.
5. Verify Fonnte rollback path is still available.
6. If all gates PASS, perform a controlled `TEST -> LIVE` switch.
7. Validate the first controlled LIVE send.
8. Mark WA-010 PASS / LOCKED and declare WA Gateway V1 ready for normal use.

## Source-of-Truth Reading Order for a New Chat

1. `docs/REDHUB_WA_GATEWAY_START_HERE.md`
2. `docs/REDHUB_WA_GATEWAY_MASTER_HANDOFF.md`
3. `docs/REDHUB_WA_GATEWAY_CHECKPOINTS.md`
4. `docs/NEXT_SESSION_PR.md`
5. `docs/REDHUB_WA_GATEWAY_DECISIONS.md`
6. `docs/REDHUB_WA_GATEWAY_API_CONTRACT.md`
7. Backend repo `bambangirawanlawyer/redhub-backend` -> `docs/CHECKPOINTS.md`

## Resume Instruction

When the user returns in a new chat and asks to continue, start directly from WA-010. Do not repeat source recovery, pairing, gateway deployment, backend adapter integration, or RB-002 UAT unless a regression is detected.
