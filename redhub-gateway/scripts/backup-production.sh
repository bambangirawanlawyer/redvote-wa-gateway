#!/usr/bin/env sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

SESSION_FILE="$BACKUP_DIR/redhub-wa-sessions-$STAMP.tgz"
DB_FILE="$BACKUP_DIR/redhub-wa-db-$STAMP.dump"

echo "BACKUP_SESSION_START"
docker compose exec -T --user root gateway   tar -C /app/data -czf - whatsapp-sessions > "$SESSION_FILE"
chmod 600 "$SESSION_FILE"

echo "BACKUP_DB_START"
docker compose exec -T db   pg_dump -U redhub_wa_app -d redhub_wa -Fc > "$DB_FILE"
chmod 600 "$DB_FILE"

test -s "$SESSION_FILE"
test -s "$DB_FILE"

echo "SESSION_BACKUP=$SESSION_FILE"
echo "DB_BACKUP=$DB_FILE"
echo "BACKUP_DONE"
