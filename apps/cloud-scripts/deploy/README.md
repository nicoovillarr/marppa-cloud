# Continuous deployment

`deploy-cloud-scripts.yml` builds cloud-scripts on a **self-hosted** runner that
lives on the host, syncs the result to `/opt/cloud-script/marppa-cloud` and
restarts the `cloud-script` service. It replaces the manual "pull + restart"
loop.

## Pipeline

Triggered on push to `master` (paths under `apps/cloud-scripts/**`,
`packages/**`, or the lockfile) and via **Run workflow**:

1. `npm ci`
2. `npm run prisma:generate -w marppa-cloud-scripts` — must precede the build:
   `packages/db` re-exports `@prisma/client`
3. `npm run build:shared` — `packages/db`, `api-types`, `shared`
4. typecheck + test (gate: a broken build never reaches `/opt`)
5. `npm run build -w marppa-cloud-scripts` — emits `dist/`
6. `rsync` the tree into `/opt/cloud-script/marppa-cloud`, preserving `.env*`
   and `.logs`
7. `sudo systemctl restart cloud-script`

The runner runs **as the `cloud-script` user**, which owns the deploy tree, so
the sync needs no privileges. The only privileged action is the restart, scoped
to a single sudoers rule — the pipeline does not rely on any blanket sudo.

The whole repo is deployed, not just `apps/cloud-scripts`: cloud-scripts
resolves `@marppa-cloud/*` through workspace symlinks under `node_modules`, so
`packages/*` and the hoisted `node_modules` must ship with it.

## One-time host setup

Run the GitHub Actions runner **as `cloud-script`** — it owns the deploy tree,
so the sync needs no sudo, and the service it restarts is its own.

```bash
# Register the runner against the repo, installed into the cloud-script home.
# GitHub → repo → Settings → Actions → Runners → New self-hosted runner
sudo -u cloud-script -H bash -c '
  mkdir -p /opt/cloud-script/actions-runner && cd /opt/cloud-script/actions-runner
  # ...download + ./config.sh with the token GitHub shows...
'
# Install as a service that runs AS cloud-script:
cd /opt/cloud-script/actions-runner
sudo ./svc.sh install cloud-script
sudo ./svc.sh start
```

Grant the runner the one privilege it needs — restarting its service:

```bash
sudo install -m 0440 -o root -g root \
  /opt/cloud-script/marppa-cloud/apps/cloud-scripts/deploy/cloud-script-deploy.sudoers \
  /etc/sudoers.d/cloud-script-deploy
sudo visudo -c -f /etc/sudoers.d/cloud-script-deploy   # must print "parsed OK"
```

Switch the service to the compiled `dist/` build (currently it runs `ts-node`
on `src/`). Install the updated unit and reload:

```bash
sudo cp /opt/cloud-script/marppa-cloud/apps/cloud-scripts/deploy/cloud-script.service \
        /etc/systemd/system/cloud-script.service
sudo systemctl daemon-reload
```

The only change from the running unit is `ExecStart`, now:

```
ExecStart=/usr/bin/node -r ./scripts/register-aliases.js dist/index.js
```

`register-aliases.js` maps the `@/…` path aliases onto `dist/` at runtime; keep
it in sync with `tsconfig.json` when a new top-level module directory is added.

## Secrets / `.env`

Nothing goes into GitHub secrets. The host keeps its own
`apps/cloud-scripts/.env.local` (mode 600, owned by `cloud-script`), and the
sync excludes `**/.env*`, so it is never touched or overwritten. For a
self-hosted runner on the same machine this is the safer choice — secrets never
leave the host. Only render env from a secret in CI if you move to a runner that
does not already hold the file; you don't need it here.

## Notes

- `runs-on: [self-hosted]` matches any self-hosted runner. Add a label (e.g.
  `cloud-script`) to both the runner and the workflow if you register more.
- The runner needs outbound internet for `npm ci` (the host already requires it
  for base images).
