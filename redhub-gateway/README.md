# RedHub WA Gateway

Private outbound WhatsApp invitation gateway for RedHub.

## Current checkpoint

**WA-001 — Local Docker Foundation**

WhatsApp/Baileys pairing is intentionally not implemented yet. That belongs to WA-002.

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
