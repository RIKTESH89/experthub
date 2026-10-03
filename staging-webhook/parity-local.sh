#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
PG_BIN=/opt/homebrew/opt/postgresql@18/bin
PARITY_RUNTIME=$(mktemp -d /tmp/experthub-webhook-parity.XXXXXX)
python3 - <<'PY'
import socket
s=socket.socket();s.bind(('127.0.0.1',55439));s.close()
PY
"$PG_BIN/initdb" -D "$PARITY_RUNTIME/data" -A trust -U billing_continuation >audit/staging-webhook/parity-initdb.log 2>&1
cleanup(){ "$PG_BIN/pg_ctl" -D "$PARITY_RUNTIME/data" stop -m fast >/dev/null 2>&1 || true; rm -rf "$PARITY_RUNTIME"; }
trap cleanup EXIT
"$PG_BIN/pg_ctl" -D "$PARITY_RUNTIME/data" -l "$PARITY_RUNTIME/postgres.log" -o "-h 127.0.0.1 -p 55439 -k $PARITY_RUNTIME -c timezone=UTC" start
"$PG_BIN/createdb" -h 127.0.0.1 -p 55439 -U billing_continuation billing_continuation
export DATABASE_URL='postgresql://billing_continuation@127.0.0.1:55439/billing_continuation' DIRECT_URL='postgresql://billing_continuation@127.0.0.1:55439/billing_continuation'
node node_modules/prisma/build/index.js migrate deploy >audit/staging-webhook/parity-migrations.log 2>&1
node node_modules/jest/bin/jest.js --config scripts/exp32-34-continuation/jest.config.cjs --runInBand --json --outputFile audit/staging-webhook/parity-tests.json >audit/staging-webhook/parity-tests.log 2>&1
