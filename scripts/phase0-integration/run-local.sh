#!/bin/bash
# Uses only the previously provisioned disposable cluster; never installs or initializes a DB.
set -euo pipefail
cd "$(dirname "$0")/../.."
PG_BIN=/opt/homebrew/opt/postgresql@18/bin
PG_DATA="$PWD/.phase0-runtime/pgdata"
if [ ! -f "$PG_DATA/PG_VERSION" ] || [ -L "$PG_DATA" ]; then
  echo 'Provision the approved standalone synthetic workspace cluster first.' >&2
  exit 1
fi
if "$PG_BIN/pg_ctl" -D "$PG_DATA" status >/dev/null 2>&1; then
  echo 'Test cluster already running; refusing to take ownership of its lifecycle.' >&2
  exit 1
fi
python3 - <<'PY'
import socket
s=socket.socket();s.bind(('127.0.0.1',55432));s.close()
PY
"$PG_BIN/pg_ctl" -D "$PG_DATA" -l .phase0-runtime/postgres.log -o '-h 127.0.0.1 -p 55432 -k /tmp -c timezone=UTC' start
trap '"$PG_BIN/pg_ctl" -D "$PG_DATA" stop -m fast' EXIT
node node_modules/jest/bin/jest.js --config scripts/phase0-integration/jest.config.cjs --runInBand --testPathPattern '(database|browser).integration' --json --outputFile audit/phase0/integration-jest.json
# The separately seeded restart-proof run is not part of ordinary fixture-reset runs.
