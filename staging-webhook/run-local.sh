#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
PG_BIN=/opt/homebrew/opt/postgresql@18/bin
WEBHOOK_RUNTIME=$(mktemp -d /tmp/experthub-webhook.XXXXXX)
mkdir -p audit/staging-webhook
python3 - <<'PY'
import socket
s=socket.socket();s.bind(('127.0.0.1',55447));s.close()
PY
"$PG_BIN/initdb" -D "$WEBHOOK_RUNTIME/pgdata" -A trust -U webhook_local >audit/staging-webhook/initdb.log 2>&1
cleanup(){ "$PG_BIN/pg_ctl" -D "$WEBHOOK_RUNTIME/pgdata" stop -m fast >/dev/null 2>&1 || true; rm -rf "$WEBHOOK_RUNTIME"; }
trap cleanup EXIT
"$PG_BIN/pg_ctl" -D "$WEBHOOK_RUNTIME/pgdata" -l "$WEBHOOK_RUNTIME/postgres.log" -o "-h 127.0.0.1 -p 55447 -k $WEBHOOK_RUNTIME -c timezone=UTC" start
"$PG_BIN/createdb" -h 127.0.0.1 -p 55447 -U webhook_local webhook_local
export DATABASE_URL='postgresql://webhook_local@127.0.0.1:55447/webhook_local' DIRECT_URL='postgresql://webhook_local@127.0.0.1:55447/webhook_local'
node node_modules/prisma/build/index.js migrate deploy >audit/staging-webhook/migrations.log 2>&1
node node_modules/prisma/build/index.js validate >audit/staging-webhook/schema-validation.log 2>&1
node node_modules/jest/bin/jest.js --config staging-webhook/jest.config.cjs --runInBand --json --outputFile audit/staging-webhook/tests.json >audit/staging-webhook/tests.log 2>&1
