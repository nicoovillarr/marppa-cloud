#!/bin/bash
set -euo pipefail

readonly MANIFEST=${MARPPA_CERT_MANIFEST:-/etc/marppa/cert-targets.json}
readonly RSYNC=/usr/bin/rsync
readonly SSH=/usr/bin/ssh
readonly SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=10)
readonly SAFE_DOMAIN='^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$'
readonly SAFE_HOST='^[A-Za-z0-9]([A-Za-z0-9.:_-]*[A-Za-z0-9])?$'
readonly SAFE_PATH='^(/[A-Za-z0-9._-]+)+$'
readonly SAFE_OWNER='^[A-Za-z0-9._-]+:[A-Za-z0-9._-]+$'
readonly FIELDS_PER_TARGET=8

failures=0

fail() {
  echo "cert sync: $*" >&2
  failures=$((failures + 1))
  return 1
}

abort() {
  echo "cert sync: $*" >&2
  exit 1
}

readManifest() {
  python3 - "$MANIFEST" <<'PY'
import json
import sys

FIELDS = ("domain", "host", "path", "owner", "dirMode", "certMode", "keyMode", "reload")
DEFAULTS = {"host": "local", "dirMode": "0750", "certMode": "0644", "keyMode": "0640", "reload": ""}
MODES = ("dirMode", "certMode", "keyMode")
REQUIRED = ("domain", "path", "owner")

path = sys.argv[1]

try:
    with open(path, encoding="utf-8") as handle:
        manifest = json.load(handle)
except (OSError, ValueError) as error:
    sys.exit(f"{path}: {error}")

out = sys.stdout.buffer


def emit(value):
    out.write(str(value).encode() + b"\0")


try:
    emit(manifest["store"])
    emit(manifest.get("sshKey") or "/root/.ssh/marppa-cert-sync")
    targets = manifest["targets"]
except KeyError as error:
    sys.exit(f"{path}: missing key {error}")

for index, target in enumerate(targets):
    for required in REQUIRED:
        if not target.get(required):
            sys.exit(f"{path}: target #{index} is missing '{required}'")

    for mode in MODES:
        raw = str(target.get(mode) or DEFAULTS[mode])
        try:
            target[mode] = format(int(raw, 8), "o")
        except ValueError:
            sys.exit(f"{path}: target #{index} has a non-octal {mode}: {raw!r}")

    for field in FIELDS:
        emit(target.get(field) or DEFAULTS.get(field, ""))

emit("COMPLETE")
PY
}

runOn() {
  local host=$1 command=$2

  if [[ $host == local ]]; then
    bash -c "$command"
  else
    "$SSH" "${SSH_OPTS[@]}" -i "$sshKey" "root@$host" "$command"
  fi
}

assertReachable() {
  local host=$1

  if [[ $host == local ]]; then
    return 0
  fi

  [[ -r $sshKey ]] \
    || fail "no readable ssh key at $sshKey — cannot reach root@$host" \
    || return

  "$SSH" "${SSH_OPTS[@]}" -i "$sshKey" "root@$host" true 2>/dev/null \
    || fail "root@$host is unreachable over ssh with $sshKey"
}

destinationFor() {
  local host=$1 path=$2

  if [[ $host == local ]]; then
    printf '%s' "$path"
  else
    printf 'root@%s:%s' "$host" "$path"
  fi
}

itemizeCopy() {
  local host=$1 source=$2 destination=$3 owner=$4 mode=$5
  local -a args=(
    --checksum --times --itemize-changes
    --chown="$owner" --chmod="F$mode"
  )

  if [[ $host != local ]]; then
    args+=(-e "$SSH ${SSH_OPTS[*]} -i $sshKey")
  fi

  "$RSYNC" "${args[@]}" "$source" "$(destinationFor "$host" "$destination")"
}

copyInto() {
  local host=$1 source=$2 destination=$3 owner=$4 mode=$5
  local itemized

  itemized=$(itemizeCopy "$host" "$source" "$destination" "$owner" "$mode") \
    || fail "rsync of $source to $host:$destination failed" \
    || return 2

  [[ $itemized == *'>f'* ]]
}

validate() {
  local domain=$1 host=$2 path=$3 owner=$4
  local before=$failures

  [[ $domain =~ $SAFE_DOMAIN ]] || fail "invalid domain: $domain"
  [[ $host == local || $host =~ $SAFE_HOST ]] || fail "invalid host for $domain: $host"
  [[ $path =~ $SAFE_PATH ]] || fail "invalid path for $domain: $path"
  [[ $owner =~ $SAFE_OWNER ]] || fail "invalid owner for $domain: $owner"

  ((failures == before))
}

assertIssued() {
  local domain=$1 source=$2 file
  local before=$failures

  for file in "$source/$domain.crt" "$source/$domain.key"; do
    [[ -r $file ]] || fail "$file is missing — caddy has not issued $domain yet"
  done

  ((failures == before))
}

syncTarget() {
  local domain=$1 host=$2 path=$3 owner=$4 dirMode=$5 certMode=$6 keyMode=$7 reload=$8
  local source="$store/$domain"
  local changed=0
  local status

  validate "$domain" "$host" "$path" "$owner" || return
  assertIssued "$domain" "$source" || return
  assertReachable "$host" || return

  runOn "$host" "install -d -m $dirMode -o ${owner%%:*} -g ${owner##*:} $path" \
    || fail "could not create $path on $host" || return

  for file in "$domain.crt:$certMode" "$domain.key:$keyMode"; do
    status=0
    copyInto "$host" "$source/${file%:*}" "$path/${file%:*}" "$owner" "${file##*:}" \
      || status=$?

    if ((status == 2)); then
      return
    fi

    if ((status == 0)); then
      changed=1
    fi
  done

  if ((changed == 0)); then
    echo "$domain -> $host:$path unchanged"
    return
  fi

  echo "$domain -> $host:$path updated"

  if [[ -n $reload ]]; then
    echo "$domain -> $host: reloading"
    runOn "$host" "$reload" || fail "reload failed for $domain on $host: $reload" || return
  fi
}

[[ -r $MANIFEST ]] || abort "cannot read $MANIFEST"

mapfile -d '' -t fields < <(readManifest)

((${#fields[@]} >= 3)) || abort "could not parse $MANIFEST"
[[ ${fields[-1]} == COMPLETE ]] || abort "could not parse $MANIFEST"

store=${fields[0]}
sshKey=${fields[1]}
targetCount=$(((${#fields[@]} - 3) / FIELDS_PER_TARGET))

[[ -d $store ]] || abort "certificate store $store does not exist"

for ((index = 0; index < targetCount; index++)); do
  syncTarget "${fields[@]:2 + index * FIELDS_PER_TARGET:FIELDS_PER_TARGET}" || true
done

((failures == 0)) || abort "$failures target(s) failed"

echo "cert sync: done"
