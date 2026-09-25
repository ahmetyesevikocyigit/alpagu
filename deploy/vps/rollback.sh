#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this script as root." >&2
  exit 1
fi

previous_file=/opt/alpagu/shared/previous-release
if [[ ! -s $previous_file ]]; then
  echo "No previous release is recorded." >&2
  exit 1
fi

previous=$(cat "$previous_file")
if [[ ! -d $previous ]]; then
  echo "Recorded release does not exist: $previous" >&2
  exit 1
fi

current=$(readlink -f /opt/alpagu/current)
ln -sfn "$previous" /opt/alpagu/current.next
mv -Tf /opt/alpagu/current.next /opt/alpagu/current
printf '%s\n' "$current" > "$previous_file"
systemctl restart alpagu.service

for _ in {1..30}; do
  if curl -fsS http://127.0.0.1:3194/api/health >/dev/null; then
    echo "ROLLED_BACK_TO=$previous"
    exit 0
  fi
  sleep 1
done

systemctl status alpagu.service --no-pager >&2 || true
exit 1
