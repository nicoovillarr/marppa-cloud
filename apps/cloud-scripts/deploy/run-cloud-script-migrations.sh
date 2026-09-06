#!/bin/bash
set -euo pipefail

readonly DEPLOY_TREE=/opt/cloud-script/marppa-cloud
readonly RUNTIME_ENV=$DEPLOY_TREE/apps/cloud-scripts/.env.local
readonly MIGRATIONS_DIR=$DEPLOY_TREE/packages/db/prisma/migrations
readonly PRISMA_CONFIG=$DEPLOY_TREE/apps/back/prisma.config.ts
readonly DEPLOY_USER=cloud-deploy
readonly DEPLOY_HOME=/home/cloud-deploy
readonly RUNUSER=/usr/sbin/runuser
readonly SECURE_PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

reject() {
  echo "refusing to run migrations: $*" >&2
  exit 1
}

[[ -d $MIGRATIONS_DIR ]] || reject "missing $MIGRATIONS_DIR"
[[ -f $PRISMA_CONFIG ]] || reject "missing $PRISMA_CONFIG"
[[ -r $RUNTIME_ENV ]] || reject "missing $RUNTIME_ENV"

databaseUrl=$(sed -n 's/^DATABASE_URL="\?\([^"]*\)"\?$/\1/p' "$RUNTIME_ENV")

[[ -n $databaseUrl ]] || reject "no DATABASE_URL in $RUNTIME_ENV"

exec "$RUNUSER" -u "$DEPLOY_USER" -- \
  env -C "$DEPLOY_TREE" -i \
  HOME="$DEPLOY_HOME" \
  PATH="$SECURE_PATH" \
  DATABASE_URL="$databaseUrl" \
  npm run prisma:migrate -w back
