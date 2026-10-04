# RedHub WA Gateway — WA-009 VPS Deployment Runbook

## Status

Target checkpoint: **WA-009 — Production Deployment**

Target VPS:

`202.10.36.74`

Old VPS:

`202.10.45.147`

The old VPS must not be touched.

WA-008 remains DEFERRED / EXTERNAL DEPENDENCY. This runbook deploys the WA Gateway as a standalone delivery service only. WA-010 RedHub end-to-end remains blocked until the actual RedHub backend becomes available.

## Production Safety Baseline

- Docker Compose only.
- Gateway host port: `127.0.0.1:3410`.
- PostgreSQL: no published host port.
- No public WhatsApp send API.
- No Nginx/domain required for the initial standalone production gate.
- Remote administration uses SSH and, when needed, an SSH tunnel.
- `.env`, session credentials and backups never enter Git.
- Session directories/files remain `700/600`.
- Gateway runs non-root inside the container.
- `AUTO_START_WHATSAPP=true` after a production session is paired.

## 1. VPS Preflight

Run from the repository directory:

```sh
sh redhub-gateway/scripts/wa009-preflight.sh
```

Required:
- Ubuntu supported host;
- Docker available;
- Docker Compose available;
- sufficient disk/memory;
- port 3410 not already occupied unexpectedly;
- existing services/containers recorded before deployment.

Do not stop or modify unrelated containers.

## 2. Repository Checkout

Preferred production directory:

```text
/opt/redhub-wa-gateway
```

Checkout the verified WA-009 branch/commit only.

Before deployment:

```sh
git status --short
git rev-parse HEAD
```

Working tree must be clean.

## 3. Production Environment

Create:

```text
/opt/redhub-wa-gateway/redhub-gateway/.env
```

Required values:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3410
POSTGRES_PASSWORD=<strong random secret>
API_TOKEN_SECRET=<64+ hex/random chars>
DOCUMENT_ALLOWED_HOSTS=
SESSION_DIR=/app/data/whatsapp-sessions
LOG_LEVEL=info
SERVICE_VERSION=0.1.0
DEFAULT_TENANT_ID=jember
DEFAULT_DEVICE_ID=jember-main
AUTO_START_WHATSAPP=true
WHATSAPP_RECONNECT_DELAY_MS=5000
```

Rules:
- do not copy local development secrets;
- do not commit `.env`;
- use new production-only secrets;
- `DOCUMENT_ALLOWED_HOSTS` stays empty until a real backend document host is known.

## 4. Build and Start

```sh
cd /opt/redhub-wa-gateway/redhub-gateway
docker compose config -q
docker compose up -d --build
docker compose ps
```

Expected host exposure:

```text
127.0.0.1:3410 -> gateway
no published PostgreSQL port
```

## 5. Health Gate

From the VPS:

```sh
curl -fsS http://127.0.0.1:3410/health
docker compose ps
```

Expected:
- HTTP health success;
- DB healthy;
- gateway healthy.

## 6. WhatsApp Production Session

The local development session credential archive must not be copied blindly into production unless an explicit migration is chosen and verified.

Preferred production flow:
1. create/start the Jember production device;
2. use an SSH tunnel to access protected pairing endpoints from the operator computer;
3. scan the fresh production QR;
4. verify `CONNECTED`;
5. verify `HAS_QR=false`;
6. restart/recreate gateway;
7. verify reconnect without QR.

No logout/unpair operation is part of WA-009.

## 7. Direct Production Delivery Gate

Before RedHub integration:
- send one controlled text to the paired test/account number;
- confirm visible receipt;
- send one controlled PDF;
- confirm visible receipt, filename and caption;
- verify provider message IDs;
- verify audit rows;
- verify no sensitive material in logs.

This validates standalone gateway production behavior only.

## 8. Backup

From `redhub-gateway/`:

```sh
sh scripts/backup-production.sh
```

The script creates:
- session archive;
- PostgreSQL custom-format dump.

Backup files are mode `600` under ignored `backups/`.

## 9. Non-Destructive Restore Verification

Use the two paths printed by the backup command:

```sh
sh scripts/verify-backup.sh <session.tgz> <database.dump>
```

Expected:

```text
BACKUP_VERIFY=PASS
```

This validates archive readability without overwriting the live production session/database.

## 10. Restart Gate

```sh
docker compose restart gateway
```

Verify:
- health returns;
- WhatsApp returns CONNECTED;
- no QR;
- provider session remains usable.

A host reboot test is performed only after all service/container dependencies are known safe.

## 11. Security / Exposure Gate

Verify:
- gateway container runs non-root;
- gateway host port only on `127.0.0.1:3410`;
- database has no host port;
- session files `600`;
- session directories `700`;
- anonymous protected endpoint -> 401;
- `.env` ignored/untracked;
- logs contain no bearer token/session key material.

## 12. WA-009 PASS / LOCKED Criteria

WA-009 may be locked only after:
- VPS preflight PASS;
- repo checkout/commit verified;
- production secrets installed;
- build/start PASS;
- health PASS;
- production WhatsApp session CONNECTED;
- session survives restart without QR;
- real production text received;
- real production PDF received;
- backup + non-destructive restore verification PASS;
- security/exposure checks PASS;
- unrelated VPS services unaffected.

WA-009 does not imply WA-008 or WA-010 PASS.
