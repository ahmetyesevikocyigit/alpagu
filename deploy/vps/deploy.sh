#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi

SITE_HOST=${SITE_HOST:-alpagu.187.124.169.67.sslip.io}
APP_PORT=${APP_PORT:-3194}
SITE_INDEXABLE=${SITE_INDEXABLE:-false}
GIT_URL=${GIT_URL:-https://github.com/ahmetyesevikocyigit/alpagu.git}
GIT_REF=${GIT_REF:-main}
PREBUILT_ARCHIVE=${PREBUILT_ARCHIVE:-}

if [[ ! $SITE_HOST =~ ^[a-z0-9.-]+$ ]]; then
  echo "Invalid SITE_HOST." >&2
  exit 1
fi
if [[ ! $APP_PORT =~ ^[0-9]+$ ]] || (( APP_PORT < 1024 || APP_PORT > 65535 )); then
  echo "Invalid APP_PORT." >&2
  exit 1
fi
if [[ $SITE_INDEXABLE != true && $SITE_INDEXABLE != false ]]; then
  echo "SITE_INDEXABLE must be true or false." >&2
  exit 1
fi

install -d -m 0755 /opt/alpagu/releases /opt/alpagu/shared
install -d -m 0755 /var/www/letsencrypt

if ! id alpagu >/dev/null 2>&1; then
  useradd --system --home-dir /var/lib/alpagu --create-home --shell /usr/sbin/nologin alpagu
fi
install -d -o alpagu -g alpagu -m 0700 /var/lib/alpagu /var/lib/alpagu/cms /var/lib/alpagu/.npm
install -d -m 0700 /etc/credstore.encrypted

if [[ ! -f /etc/credstore.encrypted/alpagu-cms-password.cred ]]; then
  mapfile -t generated < <(/usr/bin/node <<'NODE'
const { randomBytes, scryptSync } = require("node:crypto");
const password = randomBytes(18).toString("base64url");
const salt = randomBytes(16);
const hash = `scrypt:${salt.toString("hex")}:${scryptSync(password, salt, 64, {
  N: 32768,
  r: 8,
  p: 1,
  maxmem: 128 * 1024 * 1024,
}).toString("hex")}`;
console.log(password);
console.log(hash);
NODE
  )
  initial_password=${generated[0]}
  password_hash=${generated[1]}
  printf '%s' "$password_hash" | systemd-creds encrypt \
    --name=cms_password_hash \
    - /etc/credstore.encrypted/alpagu-cms-password.cred >/dev/null
  unset password_hash generated
  echo "INITIAL_ADMIN_PASSWORD=$initial_password"
  unset initial_password
fi

release_id="$(date -u +%Y%m%d%H%M%S)-$(printf '%s' "$GIT_REF" | tr -c 'a-zA-Z0-9._-' '-')"
release_dir="/opt/alpagu/releases/$release_id"
if [[ -n $PREBUILT_ARCHIVE ]]; then
  if [[ ! -f $PREBUILT_ARCHIVE ]]; then
    echo "Prebuilt archive not found: $PREBUILT_ARCHIVE" >&2
    exit 1
  fi
  install -d "$release_dir"
  tar -xzf "$PREBUILT_ARCHIVE" -C "$release_dir"
  if [[ ! -f $release_dir/server.js ]]; then
    echo "The prebuilt archive does not contain server.js." >&2
    exit 1
  fi
else
  git clone --depth 1 --branch "$GIT_REF" "$GIT_URL" "$release_dir"
  chown -R alpagu:alpagu "$release_dir"

  (cd "$release_dir" && runuser -u alpagu -- env \
    HOME=/var/lib/alpagu \
    npm_config_cache=/var/lib/alpagu/.npm \
    NEXT_PUBLIC_SITE_URL="https://$SITE_HOST" \
    SITE_INDEXABLE="$SITE_INDEXABLE" \
    /usr/bin/npx --yes pnpm@11.19.0 install --frozen-lockfile)

  (cd "$release_dir" && runuser -u alpagu -- env \
    HOME=/var/lib/alpagu \
    npm_config_cache=/var/lib/alpagu/.npm \
    NEXT_PUBLIC_SITE_URL="https://$SITE_HOST" \
    SITE_INDEXABLE="$SITE_INDEXABLE" \
    /usr/bin/npx --yes pnpm@11.19.0 build)
fi
chown -R alpagu:alpagu "$release_dir"

check_port=$((APP_PORT + 10000))
check_log="/tmp/alpagu-release-check-$release_id.log"
if [[ -f $release_dir/server.js ]]; then
  (cd "$release_dir" && runuser -u alpagu -- env \
    NODE_ENV=production \
    HOSTNAME=127.0.0.1 \
    PORT="$check_port" \
    NEXT_PUBLIC_SITE_URL="https://$SITE_HOST" \
    SITE_INDEXABLE="$SITE_INDEXABLE" \
    CMS_LOCAL_DIR=/var/lib/alpagu/cms \
    CMS_PASSWORD_HASH=release-check-only \
    /usr/bin/node server.js) >"$check_log" 2>&1 &
else
  (cd "$release_dir" && runuser -u alpagu -- env \
    NODE_ENV=production \
    NEXT_PUBLIC_SITE_URL="https://$SITE_HOST" \
    SITE_INDEXABLE="$SITE_INDEXABLE" \
    CMS_LOCAL_DIR=/var/lib/alpagu/cms \
    CMS_PASSWORD_HASH=release-check-only \
    /usr/bin/node node_modules/next/dist/bin/next start \
      --hostname 127.0.0.1 --port "$check_port") >"$check_log" 2>&1 &
fi
check_pid=$!
cleanup_check() {
  kill "$check_pid" >/dev/null 2>&1 || true
  wait "$check_pid" >/dev/null 2>&1 || true
  rm -f "$check_log"
}
trap cleanup_check EXIT
for _ in {1..30}; do
  if curl -fsS "http://127.0.0.1:$check_port/api/health" >/dev/null; then
    break
  fi
  if ! kill -0 "$check_pid" >/dev/null 2>&1; then
    cat "$check_log" >&2
    exit 1
  fi
  sleep 1
done
curl -fsS "http://127.0.0.1:$check_port/api/health" >/dev/null
cleanup_check
trap - EXIT

previous=""
if [[ -L /opt/alpagu/current ]]; then
  previous=$(readlink -f /opt/alpagu/current)
  printf '%s\n' "$previous" > /opt/alpagu/shared/previous-release
fi
ln -sfn "$release_dir" /opt/alpagu/current.next
mv -Tf /opt/alpagu/current.next /opt/alpagu/current

install -o root -g root -m 0755 "$release_dir/deploy/vps/start.sh" /opt/alpagu/shared/start.sh
sed \
  -e "s/__SITE_HOST__/$SITE_HOST/g" \
  -e "s/__APP_PORT__/$APP_PORT/g" \
  -e "s/__SITE_INDEXABLE__/$SITE_INDEXABLE/g" \
  "$release_dir/deploy/vps/alpagu.service.tmpl" \
  > /etc/systemd/system/alpagu.service

nginx_site=/etc/nginx/sites-available/alpagu
if [[ ! -e $nginx_site ]]; then
  sed \
    -e "s/__SITE_HOST__/$SITE_HOST/g" \
    -e "s/__APP_PORT__/$APP_PORT/g" \
    "$release_dir/deploy/vps/nginx.conf.tmpl" \
    > "$nginx_site"
  ln -sfn "$nginx_site" /etc/nginx/sites-enabled/alpagu
fi

systemctl daemon-reload
systemctl enable --now alpagu.service
nginx -t
systemctl reload nginx

for _ in {1..30}; do
  if curl -fsS "http://127.0.0.1:$APP_PORT/api/health" >/dev/null; then
    break
  fi
  sleep 1
done
curl -fsS "http://127.0.0.1:$APP_PORT/api/health" >/dev/null

echo "DEPLOYED_RELEASE=$release_dir"
if [[ -n $previous ]]; then
  echo "ROLLBACK_RELEASE=$previous"
fi
echo "HTTP_URL=http://$SITE_HOST"
