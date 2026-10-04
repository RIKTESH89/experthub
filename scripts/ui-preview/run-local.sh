#!/bin/sh
# Explicit synthetic-only development fixture. No installs, account or DB setup.
set -eu
cd "$(dirname "$0")/../.."
ui_port="${1:-3417}"
case "$ui_port" in *[!0-9]*|'') echo 'Expected numeric local port' >&2; exit 1;; esac
if [ "$ui_port" -lt 1024 ] || [ "$ui_port" -gt 65535 ]; then echo 'Expected unprivileged local port' >&2; exit 1; fi
for ui_env_file in .env .env.local .env.development .env.development.local; do
  if [ -e "$ui_env_file" ] || [ -L "$ui_env_file" ]; then echo 'Refusing local UI test with dotenv files present' >&2; exit 1; fi
done
exec env -i PATH="$PATH" HOME="$HOME" NODE_ENV=development \
  EXPERTHUB_LOCAL_UI_TEST=1 EXPERTHUB_UI_FIXTURES=1 \
  EXPERTHUB_LOCAL_UI_ORIGIN="http://127.0.0.1:$ui_port" \
  AUTH_URL="http://127.0.0.1:$ui_port" NEXTAUTH_URL="http://127.0.0.1:$ui_port" \
  NEXT_PUBLIC_APP_URL="http://127.0.0.1:$ui_port" AUTH_SECRET=synthetic-local-ui-only \
  DATABASE_URL=postgresql://fixture:fixture@127.0.0.1:59999/fixture \
  DIRECT_URL=postgresql://fixture:fixture@127.0.0.1:59999/fixture \
  DOTENV_CONFIG_PATH=/dev/null NEXT_TELEMETRY_DISABLED=1 \
  NODE_OPTIONS="--require=$PWD/scripts/ui-preview/network-guard.cjs" \
  ./node_modules/.bin/next dev -H 127.0.0.1 -p "$ui_port"
