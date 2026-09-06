#!/bin/bash
set -euo pipefail

readonly DOCKER=/usr/bin/docker
readonly SAFE_PATH='^(/[A-Za-z0-9._-]+)+$'

certificateDirectory=${1:-}

if [[ ! $certificateDirectory =~ $SAFE_PATH ]]; then
  echo "usage: $(basename "$0") <certificate-directory>" >&2
  exit 1
fi

mountsCertificate() {
  "$DOCKER" inspect "$1" --format '{{range .Mounts}}{{println .Source}}{{end}}' \
    | grep -qxF "$certificateDirectory"
}

restarted=0

while read -r container; do
  [[ -n $container ]] || continue
  mountsCertificate "$container" || continue

  echo "restarting $container"
  "$DOCKER" restart "$container" > /dev/null
  restarted=$((restarted + 1))
done < <("$DOCKER" ps --format '{{.Names}}')

echo "restarted $restarted container(s) mounting $certificateDirectory"
