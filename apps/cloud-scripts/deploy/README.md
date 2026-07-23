# Continuous deployment

`deploy-cloud-scripts.yml` builds cloud-scripts on a **self-hosted** runner that
lives on the host, syncs the result to `/opt/cloud-script/marppa-cloud` and
restarts the `cloud-script` service. It replaces the manual "pull + restart"
loop.

## Pipeline

Triggered on push to `master` (paths under `apps/cloud-scripts/**`,
`packages/**`, or the lockfile) and via **Run workflow**:

1. `npm ci`
2. `npm run build:shared` — `packages/db`, `api-types`, `shared`
3. `npm run prisma:generate -w marppa-cloud-scripts`
4. typecheck + test (gate: a broken build never reaches `/opt`)
5. `npm run build -w marppa-cloud-scripts` — emits `dist/`
6. `sudo rsync` the tree into `/opt/cloud-script/marppa-cloud`, owned by
   `cloud-script`, preserving `.env*` and `.logs`
7. `sudo systemctl restart cloud-script`

The whole repo is deployed, not just `apps/cloud-scripts`: cloud-scripts
resolves `@marppa-cloud/*` through workspace symlinks under `node_modules`, so
`packages/*` and the hoisted `node_modules` must ship with it.

## One-time host setup

Run the GitHub Actions runner **as `nvillar`** (has passwordless sudo, so no
extra sudoers rules are needed for `rsync`/`systemctl`).

```bash
# On the host, as nvillar — register the runner against the repo.
# GitHub → repo → Settings → Actions → Runners → New self-hosted runner
mkdir -p ~/actions-runner && cd ~/actions-runner
# ...follow the token/config commands GitHub shows, then:
sudo ./svc.sh install nvillar
sudo ./svc.sh start
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

## Notes

- `.env.local` and other `.env*` files stay put — the pipeline never overwrites
  host secrets.
- `runs-on: [self-hosted]` matches any self-hosted runner. Add a label (e.g.
  `cloud-script`) to both the runner and the workflow if you register more.
- The runner needs outbound internet for `npm ci` (the host already requires it
  for base images).
