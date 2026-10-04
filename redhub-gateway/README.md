# RedHub WA Gateway

Private outbound WhatsApp invitation gateway for RedHub.

## Current checkpoint

**WA-002 — WhatsApp Device & Persistent Session — IN PROGRESS**

Foundation WA-001 is PASS/LOCKED. WA-002 code now includes a Baileys device manager, protected pairing/status endpoints, persistent session volume, automatic reconnect, and optional auto-start. Real WhatsApp pairing is still required before WA-002 can be locked.

## Local prerequisites

- Docker Desktop / Docker Engine
- Docker Compose v2

## Start

```bash
cp .env.example .env
```

Edit the local-only values in `.env`, then:

```bash
docker compose up -d --build
```

Check:

```bash
docker compose ps
curl http://127.0.0.1:3410/health
```

Expected:

```json
{
  "status": "ok",
  "service": "redhub-wa-gateway",
  "version": "0.1.0",
  "database": "ok"
}
```

Verify migration:

```bash
docker compose exec db psql -U redhub_wa_app -d redhub_wa -c "TABLE schema_migrations;"
```

Restart persistence test:

```bash
docker compose restart
docker compose ps
curl http://127.0.0.1:3410/health
```

Stop:

```bash
docker compose down
```

Keep volumes:

```bash
docker compose down
```

Delete local volumes only when intentionally resetting development data:

```bash
docker compose down -v
```

## Development without Docker

Requires PostgreSQL and environment variables:

```bash
npm install
npm run typecheck
npm test
npm run build
npm start
```

## Security

Never commit:
- `.env`
- API tokens
- DB passwords
- WhatsApp session/auth files
- production credentials

See `../docs/REDHUB_WA_GATEWAY_START_HERE.md` before continuing the project.


## WA-002 local pairing test

Use a strong local token in `.env`:

```env
API_TOKEN_SECRET=replace-with-a-long-random-local-token
DEFAULT_TENANT_ID=jember
DEFAULT_DEVICE_ID=jember-main
AUTO_START_WHATSAPP=false
```

Start/rebuild:

```bash
docker compose up -d --build
```

Start pairing:

```bash
curl -X POST http://127.0.0.1:3410/api/v1/devices/jember-main/pair \
  -H "Authorization: Bearer replace-with-a-long-random-local-token" \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"jember"}'
```

Check status:

```bash
curl http://127.0.0.1:3410/api/v1/devices/jember-main/status \
  -H "Authorization: Bearer replace-with-a-long-random-local-token"
```

Save the short-lived QR as PNG:

```bash
curl http://127.0.0.1:3410/api/v1/devices/jember-main/pairing.png \
  -H "Authorization: Bearer replace-with-a-long-random-local-token" \
  --output redhub-wa-qr.png
```

Open `redhub-wa-qr.png` and scan it from WhatsApp Linked Devices.

After status becomes `CONNECTED`, test session persistence:

1. set `AUTO_START_WHATSAPP=true` in `.env`;
2. restart the stack;
3. confirm the same device returns to `CONNECTED` without generating a new QR.

```bash
docker compose restart
curl http://127.0.0.1:3410/api/v1/devices/jember-main/status \
  -H "Authorization: Bearer replace-with-a-long-random-local-token"
```

Do not commit the generated `.env`, QR image, or WhatsApp session data.
