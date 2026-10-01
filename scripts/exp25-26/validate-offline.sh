#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../.."
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin NEXT_TELEMETRY_DISABLED=1 node node_modules/typescript/bin/tsc --noEmit --incremental false > audit/exp25-26/types-latest.log 2>&1
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin NEXT_TELEMETRY_DISABLED=1 node node_modules/next/dist/bin/next lint > audit/exp25-26/lint-latest.log 2>&1
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin NEXT_TELEMETRY_DISABLED=1 EXPERTHUB_AUDIT_DIR="$PWD/audit/exp25-26" node node_modules/jest/bin/jest.js --runInBand --setupFiles ./audit/phase0/offline-setup.cjs --json --outputFile audit/exp25-26/full-jest-latest.json > audit/exp25-26/full-jest-latest.log 2>&1
