#!/bin/bash
set -euo pipefail

readonly SOURCE_SUDOERS=/opt/cloud-script/marppa-cloud/apps/cloud-scripts/deploy/cloud-scripts.sudoers
readonly INSTALLED_SUDOERS=/etc/sudoers.d/cloud-scripts
readonly REQUIRED_IDENTITY=cloud-script
readonly REQUIRED_RUNAS='ALL=(ALL) NOPASSWD:'
readonly DEPLOY_TREE=/opt/cloud-script/marppa-cloud
readonly ALLOWED_COMMAND_DIRS=(/usr/bin /usr/sbin /usr/local/sbin /bin /sbin)
readonly VISUDO=/usr/sbin/visudo

reject() {
  echo "refusing to install sudoers: $*" >&2
  exit 1
}

trim() {
  local value=$1
  value=${value#"${value%%[![:space:]]*}"}
  value=${value%"${value##*[![:space:]]}"}
  printf '%s' "$value"
}

logical_line() {
  local file=$1 line joined=''

  while IFS= read -r line || [[ -n $line ]]; do
    line=${line%$'\r'}
    line=${line%%#*}
    [[ -z ${line//[[:space:]]/} ]] && continue

    if [[ $line == *\\ ]]; then
      joined+="${line%\\} "
      continue
    fi

    joined+="$line"
    printf '%s\n' "$joined"
    joined=''
  done < "$file"

  [[ -z $joined ]] || reject "unterminated line continuation"
}

is_allowed_command_dir() {
  local dir=$1 allowed
  for allowed in "${ALLOWED_COMMAND_DIRS[@]}"; do
    [[ $dir == "$allowed" ]] && return 0
  done
  return 1
}

validate_command() {
  local command=$1 owner perms

  [[ ${command^^} == ALL ]] && reject "an unrestricted ALL command defeats the grant"
  [[ $command == /* ]] || reject "command must be an absolute path: $command"
  [[ $command == *[[:space:]]* ]] && reject "command must take no arguments: $command"
  [[ $command == *'*'* || $command == *'?'* ]] && reject "wildcards are not allowed: $command"
  [[ $command == "$DEPLOY_TREE"/* ]] && reject "command lives in the deploy tree: $command"

  is_allowed_command_dir "$(dirname "$command")" \
    || reject "command is outside the allowed directories: $command"

  [[ -f $command ]] || reject "command does not exist on this host: $command"

  read -r owner perms < <(stat -L -c '%U %a' "$command")
  [[ $owner == root ]] || reject "command is owned by $owner, not root: $command"
  (( 8#$perms & 8#022 )) && reject "command is group- or world-writable: $command"

  return 0
}

validate_sudoers() {
  local file=$1 rules=0 line user spec commands command

  while IFS= read -r line; do
    (( ++rules ))
    (( rules == 1 )) || reject "only one rule is allowed, found $rules"

    line=$(trim "$line")
    user=${line%%[[:space:]]*}
    [[ $user == "$REQUIRED_IDENTITY" ]] \
      || reject "the rule must grant $REQUIRED_IDENTITY, got '$user'"

    spec=$(trim "${line#"$user"}")
    [[ $spec == "$REQUIRED_RUNAS"* ]] \
      || reject "the rule must read '$REQUIRED_RUNAS', got '${spec:0:40}'"

    commands=${spec#"$REQUIRED_RUNAS"}

    IFS=',' read -ra parsed <<< "$commands"
    for command in "${parsed[@]}"; do
      command=$(trim "$command")
      [[ -z $command ]] && continue
      validate_command "$command"
    done
  done < <(logical_line "$file")

  (( rules == 1 )) || reject "no rule found"
}

[[ -f $SOURCE_SUDOERS ]] || reject "missing $SOURCE_SUDOERS"

candidate=$(mktemp)
trap 'rm -f "$candidate"' EXIT
cp "$SOURCE_SUDOERS" "$candidate"

validate_sudoers "$candidate"

"$VISUDO" -cf "$candidate" > /dev/null || reject "visudo rejected the file"

if cmp -s "$candidate" "$INSTALLED_SUDOERS"; then
  echo "sudoers unchanged"
  exit 0
fi

install -m 0440 -o root -g root "$candidate" "$INSTALLED_SUDOERS"
echo "sudoers updated"
