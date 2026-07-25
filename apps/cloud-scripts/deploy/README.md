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
7. write `DEPLOYED_SHA` (commit, ref, timestamp) at the root of the deploy tree
8. `sudo /usr/local/sbin/install-cloud-script-unit.sh` — installs the unit only
   when it changed
9. `sudo systemctl restart cloud-script`

The runner runs **as the `cloud-deploy` user**, which owns the deploy tree but
is *not* the user the service runs as. That split matters: `npm ci` executes
arbitrary `postinstall` scripts from the dependency tree, and `cloud-script`
holds passwordless sudo for `nft`, `ip`, `virsh`, `install` and `systemctl`. A
shared user would hand every one of those to a compromised dependency, plus read
access to `.env.local`.

`cloud-deploy` gets exactly three privileged actions: the unit installer, and
`restart`/`is-active` on `cloud-script`.

### Why the unit is installed through a wrapper

`cloud-deploy` writes the deploy tree, so it controls the contents of
`deploy/cloud-script.service`. Granting it `sudo install … /etc/systemd/system/`
would let it write `User=root` into the unit and restart into a root shell.

`install-cloud-script-unit.sh` runs as root, reads the unit from a **fixed**
path (it takes no arguments), copies it to a private temp file to close the
swap-after-validation window, and rejects anything that changes the service's
identity: an allowlist of directives, `User`/`Group` pinned to `cloud-script`,
`WorkingDirectory` under the deploy tree, and `ExecStart` that must start with
`/usr/bin/node ` — which also rejects systemd's `+`/`!` privilege prefixes.

`ExecStart` arguments stay free on purpose. `cloud-deploy` already controls the
code `node` executes, so constraining them buys nothing; the boundary worth
enforcing is *which identity* the service runs as.

The whole repo is deployed, not just `apps/cloud-scripts`: cloud-scripts
resolves `@marppa-cloud/*` through workspace symlinks under `node_modules`, so
`packages/*` and the hoisted `node_modules` must ship with it.

## One-time host setup

This assumes the host already runs cloud-scripts as a service: the `cloud-script`
account, `/opt/cloud-script/marppa-cloud`, the sudoers grant and the systemd unit. If it
does not, do `README.md` §3.2 first — everything here builds on that layout.

Create the deploy identity and let it write the tree while `cloud-script` keeps
read access through the group:

```bash
sudo useradd -m -s /bin/bash cloud-deploy
sudo usermod -aG cloud-script cloud-deploy

sudo chown -R cloud-deploy:cloud-script /opt/cloud-script/marppa-cloud
sudo chmod -R g+rX /opt/cloud-script/marppa-cloud
sudo chown cloud-script:cloud-script /opt/cloud-script/marppa-cloud/apps/cloud-scripts/.env.local
sudo chmod 600 /opt/cloud-script/marppa-cloud/apps/cloud-scripts/.env.local
```

Register the GitHub Actions runner **as `cloud-deploy`**:

```bash
# GitHub → repo → Settings → Actions → Runners → New self-hosted runner
sudo -u cloud-deploy -H bash -c '
  mkdir -p /opt/cloud-script/actions-runner && cd /opt/cloud-script/actions-runner
  # ...download + ./config.sh with the token GitHub shows...
'
cd /opt/cloud-script/actions-runner
sudo ./svc.sh install cloud-deploy
sudo ./svc.sh start
```

Install the unit installer as root, then the sudoers rule that lets the runner
call it:

```bash
sudo install -m 0755 -o root -g root \
  /opt/cloud-script/marppa-cloud/apps/cloud-scripts/deploy/install-cloud-script-unit.sh \
  /usr/local/sbin/install-cloud-script-unit.sh

sudo visudo -cf /opt/cloud-script/marppa-cloud/apps/cloud-scripts/deploy/cloud-script-deploy.sudoers
sudo install -m 0440 -o root -g root \
  /opt/cloud-script/marppa-cloud/apps/cloud-scripts/deploy/cloud-script-deploy.sudoers \
  /etc/sudoers.d/cloud-script-deploy
```

The installer must live outside the deploy tree. Under `/opt` it would be
writable by `cloud-deploy`, which defeats the point.

The service runs the compiled build:

```
ExecStart=/usr/bin/node -r ./scripts/register-aliases.js dist/index.js
```

`register-aliases.js` maps the `@/…` path aliases onto `dist/` at runtime; keep
it in sync with `tsconfig.json` when a new top-level module directory is added.

## Runtime sudo grant

Separate from the CI restart rule above: the **worker itself** shells out to host
tooling (`ip`, `nft`, `virsh`, `qemu-img`, …) via `sudo`, and its startup
preflight aborts without passwordless sudo for them. Install
`deploy/cloud-scripts.sudoers` as `/etc/sudoers.d/cloud-scripts`:

```bash
# validate a copy BEFORE touching /etc — a bad file in sudoers.d kills sudo
sudo visudo -cf /opt/cloud-script/marppa-cloud/apps/cloud-scripts/deploy/cloud-scripts.sudoers
sudo install -m 0440 -o root -g root \
  /opt/cloud-script/marppa-cloud/apps/cloud-scripts/deploy/cloud-scripts.sudoers \
  /etc/sudoers.d/cloud-scripts
```

Paths are host-specific: sudo resolves each bare command through its
`secure_path` (`…:/usr/sbin:/usr/bin:…`), so `ip`/`nft`/`sysctl` land under
`/usr/sbin`, not `/usr/bin`. Re-resolve per host — for each binary take the
first hit walking `/usr/local/sbin /usr/local/bin /usr/sbin /usr/bin /sbin /bin`
in order. A wrong path surfaces at runtime as `command not allowed` in the sudo
log, naming the resolved path to use.

Never write into `/etc/sudoers.d` by piping pasted text through `sudo tee`: a
truncated line or an indented heredoc terminator leaves a malformed file, and
sudo then refuses every invocation host-wide. Always `visudo -cf` a copy first,
then `install`.

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
