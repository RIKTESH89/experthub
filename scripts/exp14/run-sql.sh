#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../.."
PG_BIN=/opt/homebrew/opt/postgresql@18/bin
PG_DATA=/tmp/experthub-exp14-task4-pg55438
if [ -L "$PG_DATA" ]; then echo 'Refusing symlink cluster'; exit 1; fi
if "$PG_BIN/pg_ctl" -D "$PG_DATA" status >/dev/null 2>&1; then echo 'Cluster already running; refusing ownership'; exit 1; fi
python3 - <<'PY'
import socket
s=socket.socket();s.bind(('127.0.0.1',55438));s.close()
PY
mkdir -p audit/exp14/sql
if [ ! -f "$PG_DATA/PG_VERSION" ]; then
 "$PG_BIN/initdb" -D "$PG_DATA" -U exp14synthetic --auth=trust --encoding=UTF8 --locale=C > audit/exp14/sql/initdb.log 2>&1
fi
"$PG_BIN/pg_ctl" -D "$PG_DATA" -l "$PG_DATA/exp14.log" -o '-h 127.0.0.1 -p 55438 -k /tmp -c timezone=UTC' start > audit/exp14/sql/start.log 2>&1
trap '"$PG_BIN/pg_ctl" -D "$PG_DATA" stop -m fast > audit/exp14/sql/stop.log 2>&1' EXIT
if ! "$PG_BIN/psql" -h 127.0.0.1 -p 55438 -U exp14synthetic -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname='experthub_exp14_test'" | rg -q '^1$'; then
 "$PG_BIN/createdb" -h 127.0.0.1 -p 55438 -U exp14synthetic experthub_exp14_test
fi
export DATABASE_URL='postgresql://exp14synthetic@127.0.0.1:55438/experthub_exp14_test'
export DIRECT_URL="$DATABASE_URL"
export DOTENV_CONFIG_PATH=/dev/null
node node_modules/prisma/build/index.js migrate deploy > audit/exp14/sql/migrations.log 2>&1
node node_modules/jest/bin/jest.js --config scripts/exp14/jest.config.cjs --runInBand --json --outputFile audit/exp14/sql/jest.json > audit/exp14/sql/jest.log 2>&1
