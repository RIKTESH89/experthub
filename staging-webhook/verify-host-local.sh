#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Public dependency downloads and own ignored artifacts only. No deploy/install into app.
node staging-webhook/prepare-node24.cjs >audit/staging-webhook/node24.log 2>&1
node staging-webhook/build-package.cjs >audit/staging-webhook/packaging.log 2>&1
bash staging-webhook/run-local.sh
node node_modules/typescript/bin/tsc --noEmit -p staging-webhook/tsconfig.json >audit/staging-webhook/targeted-typecheck.log 2>&1
