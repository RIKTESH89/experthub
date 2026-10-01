#!/bin/bash
# Only the already-approved disposable synthetic cluster. No installs/provider calls/env-file reads.
set -euo pipefail
cd "$(dirname "$0")/../.."
export LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
PG_BIN=/opt/homebrew/opt/postgresql@18/bin
PG_DATA="$PWD/.phase0-runtime/pgdata"
if [ ! -f "$PG_DATA/PG_VERSION" ] || [ -L "$PG_DATA" ]; then echo 'Missing approved cluster' >&2; exit 1; fi
if "$PG_BIN/pg_ctl" -D "$PG_DATA" status >/dev/null 2>&1; then echo 'Already running; refusing ownership' >&2; exit 1; fi
python3 - <<'CHECK'
import socket
s=socket.socket();s.bind(('127.0.0.1',55432));s.close()
CHECK
"$PG_BIN/pg_ctl" -D "$PG_DATA" -l .phase0-runtime/postgres.log -o '-h 127.0.0.1 -p 55432 -k /tmp -c timezone=UTC' start
trap '"$PG_BIN/pg_ctl" -D "$PG_DATA" stop -m fast' EXIT
export EXPERTHUB_AUDIT_DIR="$PWD/audit/exp25-26"
export DATABASE_URL='postgresql://phase0synthetic:synthetic-local-only@127.0.0.1:55432/experthub_phase0_test'
export DIRECT_URL="$DATABASE_URL" DOTENV_CONFIG_PATH=/dev/null
node node_modules/prisma/build/index.js migrate deploy > audit/exp25-26/migrations.log 2>&1
node node_modules/jest/bin/jest.js --config scripts/exp25-26/jest.config.cjs --runInBand --json --outputFile audit/exp25-26/payment-integration.json > audit/exp25-26/payment-integration.log 2>&1
if [ "${EXP25_26_REGRESSIONS:-0}" = 1 ]; then
node node_modules/jest/bin/jest.js --config scripts/exp13/jest.config.cjs --runInBand --json --outputFile audit/exp25-26/exp13-regression.json > audit/exp25-26/exp13-regression.log 2>&1
node node_modules/jest/bin/jest.js --config scripts/exp12/jest.config.cjs --runInBand --json --outputFile audit/exp25-26/exp12-regression.json > audit/exp25-26/exp12-regression.log 2>&1
node node_modules/jest/bin/jest.js --config scripts/phase0-integration/jest.config.cjs --runInBand --testPathPattern '(database|browser).integration' --json --outputFile audit/exp25-26/phase0-regression.json > audit/exp25-26/phase0-regression.log 2>&1
fi
if [ "${EXP25_26_BUILD:-0}" = 1 ]; then
export AUTH_SECRET='synthetic-exp25-26-session-only' AUTH_TRUST_HOST=true NEXT_TELEMETRY_DISABLED=1
export NEXT_FONT_GOOGLE_MOCKED_RESPONSES="$PWD/scripts/exp25-26/font-mock.cjs"
export NODE_OPTIONS="--require=$PWD/scripts/exp25-26/network-guard.cjs"
node node_modules/next/dist/bin/next build > audit/exp25-26/build.log 2>&1
node scripts/exp25-26/browser.cjs > audit/exp25-26/built-browser.log 2>&1
elif [ "${EXP25_26_BROWSER:-0}" = 1 ]; then
node scripts/exp25-26/browser.cjs > audit/exp25-26/built-browser.log 2>&1
fi
