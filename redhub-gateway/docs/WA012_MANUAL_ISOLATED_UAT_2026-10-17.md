# WA012 — Manual isolated UAT via SSH (NO Desktop Commander)

**Owner instruction:** manual terminal workflow, without Desktop Commander.
**Scope:** temporary Gateway instance on **a separate non-production Linux VPS/PC**. This is a real Gateway container with Baileys, using **only one dedicated disposable WhatsApp test number**, when explicitly confirmed by owner. No RedHub production Firebase credentials, active Jember/Banyuwangi WhatsApp account, LIVE broadcast, or production host changes.

## Gate 0 — required before command 1

- Use **a separate test machine**, NOT production `redhub.redvote.id` / RedHub production VPS / actual production Gateway host. Do not run the steps on production. Never copy an existing `.env`, token, database, or session directory from production.
- A disposable WhatsApp test phone/account, not used as a sender for any production Organisasi, is required for QR pairing. Until identified, perform only Gate 1 (environment startup and health).
- Installed: Git, Docker Engine / Docker Compose v2, OpenSSL, curl, Python 3; enough CPU/RAM/disk for a single PostgreSQL + Gateway.

## Gate 1 — build separate manual staging Gateway, no pairing

Run **on that separate test machine**:

```bash
git clone --single-branch --branch feat/wa012-tenant-device-disconnect-repair-20261017 \
  https://github.com/bambangirawanlawyer/redvote-wa-gateway.git
cd redvote-wa-gateway/redhub-gateway

# Do not run from the production Git checkout. Both secrets below are NEW and local.
umask 077
printf 'POSTGRES_PASSWORD=%s\nAPI_TOKEN_SECRET=%s\n' \
  "$(openssl rand -hex 24)" "$(openssl rand -hex 32)" > .env.wa012-uat
chmod 600 .env.wa012-uat
docker compose -p redhub_wa012_manual --env-file .env.wa012-uat \
  -f docker-compose.wa012-uat.yml up -d --build
curl -fsS http://127.0.0.1:13410/health
```

Expected: HTTP JSON `{"status":"ok","service":"redhub-wa-gateway",...,"database":"ok"}`. **NO WhatsApp connection yet**: `AUTO_START_WHATSAPP=false`. Bind is loopback `127.0.0.1:13410` (not production port 3410). Project name `redhub_wa012_manual`; its Postgres and session Docker volumes are separate.

If Docker health fails, use scoped log command **without echoing secrets**:
```bash
docker compose -p redhub_wa012_manual --env-file .env.wa012-uat \
  -f docker-compose.wa012-uat.yml ps
```

Before Gate 2, explicitly verify account is test-only and nobody uses it in LIVE.

## Gate 1A — fix EACCES migrations on initial test startup

If `curl /health` returns `curl: (56) Recv failure: Connection reset by peer` and the isolated Gateway logs show `EACCES: permission denied, open '/app/migrations/001_foundation.sql'`, the build image copied SQL as root but the service runs as unprivileged `app`. **This is an image packaging problem, not a PostgreSQL password problem.** Dockerfile was corrected on the WA012 branch to give ownership and restricted `0600` SQL permissions to the app user. No database reset is required.

After the fix is verified in GitHub CI, on the **same isolated test clone** (directory `redvote-wa-gateway/redhub-gateway`), run:

```bash
git pull --ff-only origin feat/wa012-tenant-device-disconnect-repair-20261017
docker compose -p redhub_wa012_manual --env-file .env.wa012-uat \
  -f docker-compose.wa012-uat.yml up -d --build --no-deps gateway
curl -fsS --retry 10 --retry-all-errors --retry-delay 2 \
  http://127.0.0.1:13410/health
```

This recreates **only** the isolated Gateway container using its fixed image; keeps separate Postgres and WhatsApp session volumes and local `.env.wa012-uat`; does **not** issue `down -v` or restart production. Do not use `chmod -R 777`, `sudo` to run the Gateway as root, or `docker compose down -v`. If failure persists, read only the isolated Gateway logs again. This does not perform WhatsApp pairing.

## Gate 2 — manual real-device pair / disconnect / re-pair

**Only after non-production WhatsApp account is confirmed.** Stay in `redhub-gateway`. Load only new test credentials into current terminal (do not paste them into chat):

```bash
set -a; . ./.env.wa012-uat; set +a
BASE=http://127.0.0.1:13410
AUTH="Authorization: Bearer $API_TOKEN_SECRET"
```

1. Trigger **disposable device only** `wa012_uat_01`:

```bash
curl -fsS -X POST "$BASE/api/v1/devices/wa012_uat_01/pair" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"tenantId":"wa012_uat_only"}'
```

2. Fetch QR as private PNG on **test machine only**. The QR is temporary and **must not** be sent to ChatGPT:

```bash
curl -fsS "$BASE/api/v1/devices/wa012_uat_01/pairing.png?tenantId=wa012_uat_only" \
  -H "$AUTH" -o wa012-qr.png
chmod 600 wa012-qr.png
```

If SSH machine is headless, securely copy PNG to your own PC and scan it with the disposable WhatsApp account's *Linked Devices* feature. Never scan with Jember's active WA sender.

3. Read status (showing only non-secret fields):

```bash
curl -fsS "$BASE/api/v1/devices/wa012_uat_01/status?tenantId=wa012_uat_only" \
  -H "$AUTH" | python3 -c 'import sys,json; d=json.load(sys.stdin); print({k:d.get(k) for k in ("tenantId","deviceId","status","hasQr","lastErrorCode")})'
```

Expected `CONNECTED`.

4. Preserve and restart the isolated Gateway (session should restore to `CONNECTED` without new QR):

```bash
docker compose -p redhub_wa012_manual --env-file .env.wa012-uat \
  -f docker-compose.wa012-uat.yml restart gateway
```

Re-run status command above.

5. **Irreversible test-only unlink**: only if the device is `wa012_uat_01` and account was explicitly confirmed disposable:

```bash
curl -fsS -X POST "$BASE/api/v1/devices/wa012_uat_01/disconnect" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"tenantId":"wa012_uat_only","confirmation":"DISCONNECT_wa012_uat_01"}'
```

Expected `DISCONNECTED`, `remoteLogoutUnconfirmed=false` when remote logout succeeds. If `remoteLogoutUnconfirmed=true`, verify and manually unlink in the disposable phone's Linked Devices; **do not** claim remote logout PASS. Verify the status API shows `DISCONNECTED`.

6. Re-pair the **same disposable** account using step 1 and new QR step 2; verify `CONNECTED` again. For replacement with **a different** number, a second separately approved disposable WhatsApp account is required, using device id `wa012_uat_02` (do NOT reuse Jember's active number).

## Gate 3 — pause, stop, cleanup

Stop test services but **retain isolated volumes/session**:

```bash
docker compose -p redhub_wa012_manual --env-file .env.wa012-uat \
  -f docker-compose.wa012-uat.yml down
```

Only if explicitly abandoning this entire **test** stack, `down -v` removes its **isolated** test DB and session volumes. Do not run `down -v` against any other Compose project. Remove `wa012-qr.png` after scanning and do not share credentials, QR or actual phone numbers in reports.

## UAT readback needed for checkpoint

Report **only**:
`WA012_HEALTH=PASS/FAIL`,
`WA012_PAIR_TEST=PASS/FAIL`,
`WA012_RESTART_SESSION=PASS/FAIL`,
`WA012_DISCONNECT=PASS/FAIL/REMOTE_UNCONFIRMED`,
`WA012_REPAIR=PASS/FAIL`.
Never report PASS based on CI simulations. Real-device UAT does not yet certify RedHub authenticated Admin UI because a separate RedHub Firebase/Auth staging environment is not provisioned.

## Prohibited

- No production IP/VPS, `redhub.redvote.id` or port 3410; no production Docker volumes, sessions or tokens.
- No real production QR scan, disconnect, restart, WhatsApp send, or LIVE broadcast.
- Do not paste `.env.wa012-uat`, `wa012-qr.png`, or WhatsApp numbers into chat.
