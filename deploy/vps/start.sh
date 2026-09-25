#!/bin/sh
set -eu

credential="${CREDENTIALS_DIRECTORY:?}/cms_password_hash"
if [ ! -r "$credential" ]; then
  echo "CMS password credential is unavailable" >&2
  exit 1
fi

export CMS_PASSWORD_HASH
CMS_PASSWORD_HASH="$(cat "$credential")"

if [ -f server.js ]; then
  export HOSTNAME=127.0.0.1
  exec /usr/bin/node server.js
fi

exec /usr/bin/node node_modules/next/dist/bin/next start \
  --hostname 127.0.0.1 \
  --port "${PORT:?}"
