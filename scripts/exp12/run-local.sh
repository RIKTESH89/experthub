#!/bin/bash
# Previously approved disposable cluster only. No installation/initialization/provider calls.
set -euo pipefail
cd "$(dirname "$0")/../.."
PG_BIN=/opt/homebrew/opt/postgresql@18/bin
PG_DATA="$PWD/.phase0-runtime/pgdata"
if [ ! -f "$PG_DATA/PG_VERSION" ] || [ -L "$PG_DATA" ]; then echo 'Missing approved cluster' >&2; exit 1; fi
if "$PG_BIN/pg_ctl" -D "$PG_DATA" status >/dev/null 2>&1; then echo 'Already running; refusing ownership' >&2; exit 1; fi
python3 - <<'PY'
import socket
s=socket.socket();s.bind(('127.0.0.1',55432));s.close()
PY
"$PG_BIN/pg_ctl" -D "$PG_DATA" -l .phase0-runtime/postgres.log -o '-h 127.0.0.1 -p 55432 -k /tmp -c timezone=UTC' start
trap '"$PG_BIN/pg_ctl" -D "$PG_DATA" stop -m fast' EXIT
export DATABASE_URL='postgresql://phase0synthetic:synthetic-local-only@127.0.0.1:55432/experthub_phase0_test'
export DIRECT_URL="$DATABASE_URL"
export DOTENV_CONFIG_PATH=/dev/null
# No existing/project environment file is loaded; this URL is the isolated synthetic DB.
node node_modules/prisma/build/index.js migrate deploy > audit/exp12/migrations.log 2>&1
node node_modules/jest/bin/jest.js --config scripts/exp12/jest.config.cjs --runInBand --json --outputFile audit/exp12/integration-jest.json > audit/exp12/integration-jest.log 2>&1

if [ "${EXP12_INCLUDE_PHASE0:-0}" = 1 ]; then
node node_modules/jest/bin/jest.js --config scripts/phase0-integration/jest.config.cjs --runInBand --testPathPattern '(database|browser).integration' --json --outputFile audit/exp12/phase0-integration-jest.json > audit/exp12/phase0-integration-jest.log 2>&1
fi
