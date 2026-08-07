#!/bin/bash
set -euo pipefail

readonly SOURCE_UNIT=/opt/cloud-script/marppa-cloud/apps/cloud-scripts/deploy/cloud-script.service
readonly INSTALLED_UNIT=/etc/systemd/system/cloud-script.service
readonly REQUIRED_IDENTITY=cloud-script
readonly REQUIRED_WORKDIR_PREFIX=/opt/cloud-script/marppa-cloud
readonly REQUIRED_EXEC_PREFIX='/usr/bin/node '
readonly ALLOWED_DIRECTIVES=(
  Description After Wants
  Type User Group WorkingDirectory Environment ExecStart
  Restart RestartSec TimeoutStopSec KillMode
  ProtectHome ProtectSystem
  WantedBy
)

reject() {
  echo "refusing to install unit: $*" >&2
  exit 1
}

is_allowed_directive() {
  local candidate=$1 allowed
  for allowed in "${ALLOWED_DIRECTIVES[@]}"; do
    [[ $candidate == "$allowed" ]] && return 0
  done
  return 1
}

validate_unit() {
  local unit=$1
  local line key value
  local has_user=0 has_group=0 has_exec_start=0

  while IFS= read -r line || [[ -n $line ]]; do
    [[ -z ${line// /} || $line == '#'* || $line == ';'* || $line == '['* ]] && continue
    [[ $line == *=* ]] || reject "malformed line: $line"

    key=${line%%=*}
    value=${line#*=}

    is_allowed_directive "$key" || reject "directive not allowed: $key"

    case $key in
      User)
        [[ $value == "$REQUIRED_IDENTITY" ]] || reject "User must be $REQUIRED_IDENTITY, got '$value'"
        has_user=1
        ;;
      Group)
        [[ $value == "$REQUIRED_IDENTITY" ]] || reject "Group must be $REQUIRED_IDENTITY, got '$value'"
        has_group=1
        ;;
      WorkingDirectory)
        [[ $value == "$REQUIRED_WORKDIR_PREFIX" || $value == "$REQUIRED_WORKDIR_PREFIX"/* ]] \
          || reject "WorkingDirectory must be under $REQUIRED_WORKDIR_PREFIX, got '$value'"
        ;;
      ExecStart)
        [[ $value == "$REQUIRED_EXEC_PREFIX"* ]] \
          || reject "ExecStart must start with '$REQUIRED_EXEC_PREFIX', got '$value'"
        has_exec_start=1
        ;;
      ProtectSystem)
        [[ $value == yes ]] \
          || reject "ProtectSystem must be 'yes' ('$value' makes /etc read-only and breaks the nftables writes)"
        ;;
    esac
  done < "$unit"

  (( has_user )) || reject "missing User="
  (( has_group )) || reject "missing Group="
  (( has_exec_start )) || reject "missing ExecStart="
}

[[ -f $SOURCE_UNIT ]] || reject "missing $SOURCE_UNIT"

candidate=$(mktemp)
trap 'rm -f "$candidate"' EXIT
cp "$SOURCE_UNIT" "$candidate"

validate_unit "$candidate"

if cmp -s "$candidate" "$INSTALLED_UNIT"; then
  echo "unit unchanged"
  exit 0
fi

install -m 0644 -o root -g root "$candidate" "$INSTALLED_UNIT"
systemctl daemon-reload
echo "unit updated"
