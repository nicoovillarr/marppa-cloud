#!/bin/bash
set -euo pipefail

readonly SOURCE_CADDYFILE=/opt/cloud-script/marppa-cloud/apps/cloud-scripts/deploy/Caddyfile
readonly INSTALLED_CADDYFILE=/etc/caddy/Caddyfile
readonly CANDIDATE_CADDYFILE=/etc/caddy/Caddyfile.candidate
readonly BACKUP_CADDYFILE=/etc/caddy/Caddyfile.marppa.bak
readonly REQUIRED_IMPORT='import sites/*.caddy'
readonly CADDY=/usr/bin/caddy
readonly SYSTEMCTL=/usr/bin/systemctl

reject() {
  echo "refusing to install Caddyfile: $*" >&2
  exit 1
}

[[ -f $SOURCE_CADDYFILE ]] || reject "missing $SOURCE_CADDYFILE"

grep -qxF "$REQUIRED_IMPORT" "$SOURCE_CADDYFILE" \
  || reject "the config must keep '$REQUIRED_IMPORT' or every portal stops being served"

grep -qE '^\s*import\s+/' "$SOURCE_CADDYFILE" \
  && reject "imports must stay relative to /etc/caddy"

install -m 0644 -o root -g caddy "$SOURCE_CADDYFILE" "$CANDIDATE_CADDYFILE"
trap 'rm -f "$CANDIDATE_CADDYFILE"' EXIT

"$CADDY" validate --config "$CANDIDATE_CADDYFILE" > /dev/null 2>&1 \
  || reject "caddy rejected the config together with the portals it imports"

if cmp -s "$CANDIDATE_CADDYFILE" "$INSTALLED_CADDYFILE"; then
  echo "Caddyfile unchanged"
  exit 0
fi

cp -a "$INSTALLED_CADDYFILE" "$BACKUP_CADDYFILE"
install -m 0644 -o root -g caddy "$CANDIDATE_CADDYFILE" "$INSTALLED_CADDYFILE"

if ! "$SYSTEMCTL" reload caddy; then
  install -m 0644 -o root -g caddy "$BACKUP_CADDYFILE" "$INSTALLED_CADDYFILE"
  "$SYSTEMCTL" reload caddy || true
  reject "caddy failed to reload; restored the previous config from $BACKUP_CADDYFILE"
fi

echo "Caddyfile updated"
