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

## Docker (Nucleus)

The Nucleus module runs atoms as Docker containers. Docker's default behaviour is
incompatible with this host: with `iptables` enabled the daemon writes its own
chains into `ip nat` and `inet filter` — the two tables `LinuxMeshService` dumps
and rewrites on every zone or fiber change, and which `SYSTEM_RESET` recreates
from `NFTABLES_RESET_SOURCE`. Docker's rules would be dropped silently, and
`saveNftConfiguration` would persist Docker's rules into `/etc/nftables.conf` as
if the app owned them.

(`NFTABLES_RESET_SOURCE` must **not** contain `flush ruleset` — see `README.md`
§ *nftables base ruleset* for the `add`/`delete` pair that replaces it. A host
still carrying the old `flush ruleset` version loses every table on reset,
fail2ban's `inet f2b-table` included.)

The daemon is therefore configured never to touch packet filtering.
`deploy/docker-daemon.json` must be installed as `/etc/docker/daemon.json`
**before Docker is first started** — a daemon that has already run leaves chains
behind that then have to be flushed by hand:

```bash
sudo mkdir -p /etc/docker
sudo install -m 644 \
  /opt/cloud-script/marppa-cloud/apps/cloud-scripts/deploy/docker-daemon.json \
  /etc/docker/daemon.json
```

What each setting buys:

| Setting | Why |
| --- | --- |
| `iptables: false`, `ip6tables: false` | the daemon never writes an nftables rule, so `inet filter`, `ip nat` and `inet f2b-table` stay exactly as their owners left them |
| `bridge: none` | no `docker0`; the default bridge would need masquerading that no longer exists, so containers on it would silently have no egress |
| `live-restore: true` | atoms survive a daemon restart |

Connectivity then comes entirely from the mesh, not from Docker:

- an atom needs a `Node` in an `ACTIVE` zone, exactly like a worker;
- `ensureZoneNetwork` maps a Docker network onto that zone's **pre-existing**
  bridge (`com.docker.network.bridge.name=<zoneId>`, masquerading off), so Docker
  adopts the device instead of creating one it would later delete;
- the container is addressed with its node's IP, and egress NAT comes from the
  zone's `postrouting` rules — including the RFC1918 `return` carve-outs Docker's
  own masquerade would have trampled;
- **ports are never published with `-p`.** A port reachable from outside the zone
  is a `Fiber`, i.e. a DNAT rule in the app's own `ip nat` table.

Both `HostPreflightService` (at startup and before every reset) and
`DockerNucleusService.ensureZoneNetwork` refuse to continue if a `DOCKER*` chain
shows up in the live ruleset, so a daemon that silently regains its firewall
management is caught before it can clobber anything.

`AtomImage.command`, when set, is appended as trailing positional args after
the image ref in `startAtom` — see `apps/back/README.md`'s Nucleus section for
why (base OS images with no long-running foreground process need it, service
images like postgres/redis/wg-easy leave it empty). Each token goes through
`SAFE_COMMAND_TOKEN` before reaching `docker run`, same as every other
interpolated value in this file.

`cloud-script` reaches Docker through `sudo docker` (see the sudoers grant), not
through membership of the `docker` group, so every call stays inside the same
auditable allowlist as `virsh` and `nft`.

### Atom console

The exec-into-atom feature (`DockerExecService`) shells out to the same
`sudo docker exec -it` from the allowlist above — it deliberately does **not**
talk to `/var/run/docker.sock` directly, which would need `cloud-script` in the
`docker` group and step outside the auditable-allowlist model this doc just
described. The real-terminal behaviour (resize, colors, job control) instead
comes from wrapping that command in a locally-allocated pseudo-tty via
`node-pty`, so Docker's own `-t` isatty check passes without a client terminal.

`node-pty` has a native addon and needs a C++ build toolchain
(`build-essential`, `python3`) on whatever host runs `npm ci` for
`cloud-scripts` — the self-hosted CI runner in this pipeline, since it's the
one executing `npm ci`.

### Worker console

Same `node-pty` wrapper, but around `sudo virsh console <vmName> --force`
instead of `docker exec`. Unlike Docker containers, the cloud image's `ubuntu`
user has no password (`lock_passwd: true`, `ssh_pwauth: false`) — a serial
console login prompt is otherwise a dead end if SSH itself is what broke, which
is exactly the scenario this exists for.

`WorkerCreateProcessor` generates a random password per worker, bakes it into
the cloud-init `chpasswd` module (local console login only — `ssh_pwauth`
stays `false`, so it's useless over the network), and stores it **encrypted**
in `Worker.consolePassword` via `SecretCipher` (AES-256-GCM). Nothing ever
shows this password to a human: `WorkerConsoleService.open()` decrypts it
server-side and types it into the pty right after attaching, so opening a
worker console lands you already logged in, same as the atom console.

Requires `WORKER_CONSOLE_SECRET_KEY` in `.env.local` — a 64-char hex string
(32 bytes). Generate with `openssl rand -hex 32`. Rotating it orphans every
already-encrypted `consolePassword` in the DB (they become undecryptable) —
existing workers keep running, they just lose console access until recreated.

Only workers created **after** this feature shipped have a console password on
record; earlier workers have `consolePassword = NULL` and the console stays
unavailable for them.

## Secrets / `.env`

Nothing goes into GitHub secrets. The host keeps its own
`apps/cloud-scripts/.env.local` (mode 600, owned by `cloud-script`), and the
sync excludes `**/.env*`, so it is never touched or overwritten. For a
self-hosted runner on the same machine this is the safer choice — secrets never
leave the host. Only render env from a secret in CI if you move to a runner that
does not already hold the file; you don't need it here.

## Service hardening

The unit sets `ProtectHome=yes` and `ProtectSystem=full`. The service holds a
broad sudo grant, so these narrow what a compromised worker reaches: `/home` is
invisible, and `/usr` and `/boot` are read-only while `/etc` stays writable —
the app rewrites `/etc/nftables.conf`, the dnsmasq configs and the systemd
network units, so `ProtectSystem=strict` would break it.

Two options are deliberately absent:

- **`NoNewPrivileges`** — the worker shells out through `sudo`, which is exactly
  what this flag blocks.
- **`PrivateTmp`** — `/tmp` is shared with other services. `LinuxMeshService`
  clears `/tmp/dnsmasq.leases`, a file **dnsmasq** owns; with a private `/tmp`
  that `rm` would hit an empty namespace and report success while the real lease
  file survived. The VM XML files under `/tmp` would be fine (they are read by
  `virsh` inside the same namespace), but the lease case makes the whole option
  a silent-failure risk.

## Notes

- `runs-on: [self-hosted]` matches any self-hosted runner. Add a label (e.g.
  `cloud-script`) to both the runner and the workflow if you register more.
- The runner needs outbound internet for `npm ci` (the host already requires it
  for base images).
