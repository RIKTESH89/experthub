#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../.."
PG_BIN=/opt/homebrew/opt/postgresql@18/bin
PG_DATA="$PWD/.billing-continuation-runtime/pgdata"
mkdir -p .billing-continuation-runtime audit/exp32-34-continuation
if [ -L "$PG_DATA" ]; then echo 'Refusing symlink cluster' >&2; exit 1; fi
if [ -f "$PG_DATA/PG_VERSION" ] && "$PG_BIN/pg_ctl" -D "$PG_DATA" status >/dev/null 2>&1; then echo 'Already running; refusing ownership' >&2; exit 1; fi
python3 - <<'PY'
import socket
s=socket.socket();s.bind(('127.0.0.1',55439));s.close()
PY
if [ ! -f "$PG_DATA/PG_VERSION" ]; then "$PG_BIN/initdb" -D "$PG_DATA" -A trust -U billing_continuation > audit/exp32-34-continuation/initdb.log 2>&1; fi
"$PG_BIN/pg_ctl" -D "$PG_DATA" -l .billing-continuation-runtime/postgres.log -o '-h 127.0.0.1 -p 55439 -k /tmp -c timezone=UTC' start
BILLING_PID=$(head -1 "$PG_DATA/postmaster.pid")
cleanup() { if [ -f "$PG_DATA/postmaster.pid" ] && [ "$(head -1 "$PG_DATA/postmaster.pid")" = "$BILLING_PID" ]; then "$PG_BIN/pg_ctl" -D "$PG_DATA" stop -m fast; fi; }
trap cleanup EXIT
export DATABASE_URL='postgresql://billing_continuation@127.0.0.1:55439/billing_continuation' DIRECT_URL='postgresql://billing_continuation@127.0.0.1:55439/billing_continuation'
if ! "$PG_BIN/psql" "$DATABASE_URL" -c 'SELECT 1' >/dev/null 2>&1; then "$PG_BIN/createdb" -h 127.0.0.1 -p 55439 -U billing_continuation billing_continuation; fi
node node_modules/prisma/build/index.js migrate deploy > audit/exp32-34-continuation/migrations.log 2>&1
node node_modules/prisma/build/index.js validate > audit/exp32-34-continuation/schema-validation.log 2>&1
node node_modules/typescript/bin/tsc --noEmit --incremental false > audit/exp32-34-continuation/typecheck.log 2>&1
node node_modules/jest/bin/jest.js --config scripts/exp32-34-continuation/jest.config.cjs --runInBand --json --outputFile audit/exp32-34-continuation/tests.json > audit/exp32-34-continuation/tests.log 2>&1
