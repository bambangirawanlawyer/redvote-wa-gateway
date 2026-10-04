#!/usr/bin/env sh
set -eu

SESSION_FILE="${1:-}"
DB_FILE="${2:-}"

if [ -z "$SESSION_FILE" ] || [ -z "$DB_FILE" ]; then
  echo "Usage: $0 <session.tgz> <database.dump>"
  exit 2
fi

test -s "$SESSION_FILE"
test -s "$DB_FILE"

echo "VERIFY_SESSION_ARCHIVE"
tar -tzf "$SESSION_FILE" | grep -q '^whatsapp-sessions/'
tar -tzf "$SESSION_FILE" | grep -q '/creds.json$'

echo "VERIFY_DB_ARCHIVE"
cat "$DB_FILE" | docker compose exec -T db pg_restore -l >/dev/null

echo "BACKUP_VERIFY=PASS"
