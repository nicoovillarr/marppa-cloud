# Continuous deployment

`deploy-cloud-scripts.yml` builds cloud-scripts on a **self-hosted** runner that
lives on the host, syncs the result to `/opt/cloud-script/marppa-cloud` and
restarts the `cloud-script` service. It replaces the manual "pull + restart"
loop.

## Deployment topology

One repo, three deployables, two pipelines that do not know about each other:

| What | Where | Configured in |
| --- | --- | --- |
| `apps/cloud-scripts` | the home-server, via the self-hosted runner | this workflow |
| `apps/back` | Render | Render's dashboard |
| `apps/front` | Render | Render's dashboard |

Nothing in this repository describes the Render side — no `render.yaml`, no build command,
no environment. Read that in the dashboard, and expect to be surprised by it.

**Render owns the database migrations.** It runs `prisma migrate deploy` as part of its own
deploy; this workflow deliberately does not, so the schema has exactly one writer.

Both pipelines fire on the same push to `master` and reach the same database, with no
ordering between them. That matters for any commit that changes the schema: if the
self-hosted runner finishes first, `cloud-script` restarts with a Prisma client that selects
a column Render has not created yet, and every query on that model fails until Render
catches up. It heals on its own, but the events that failed in between stay failed.

The safe direction is old code against a new schema, which is why schema changes want the
expand/contract shape — add the column in one commit, stop reading it in a later one, drop
it in a third.

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
8. `sudo /usr/local/sbin/install-cloud-script-sudoers.sh` — installs the runtime
   sudo grant only when it changed, before the new code can need it
9. `sudo /usr/local/sbin/install-cloud-script-unit.sh` — installs the unit only
   when it changed
10. `sudo /usr/local/sbin/install-cloud-script-caddyfile.sh` — installs the
    hand-written Caddy config only when it changed, and reloads Caddy
11. `sudo systemctl restart cloud-script`

The runner runs **as the `cloud-deploy` user**, which owns the deploy tree but
is *not* the user the service runs as. That split matters: `npm ci` executes
arbitrary `postinstall` scripts from the dependency tree, and `cloud-script`
holds passwordless sudo for `nft`, `ip`, `virsh`, `install` and `systemctl`. A
shared user would hand every one of those to a compromised dependency, plus read
access to `.env.local`.

`cloud-deploy` gets exactly five privileged actions: the unit, sudoers and
Caddyfile installers, and `restart`/`is-active` on `cloud-script`.

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

### Why the sudo grant is installed through a wrapper

The runtime grant changes whenever cloud-scripts learns to call a new host binary —
`lvcreate` and `mkfs.ext4` arrived with atom volumes — and a grant only a human can install
is a grant that drifts: the code ships, the binary is refused at runtime, and the failure
surfaces as a broken event hours later.

The hazard is the one the unit installer already answers. `cloud-deploy` writes the deploy
tree, so it controls `deploy/cloud-scripts.sudoers`; `sudo install … /etc/sudoers.d/` would
let it grant *itself* passwordless root.

`install-cloud-script-sudoers.sh` runs as root, reads a **fixed** path, copies to a private
temp file, and refuses anything that is not one rule granting `cloud-script`:

- a single rule — a second line cannot smuggle in another user;
- the user pinned to `cloud-script`, the spec to `ALL=(ALL) NOPASSWD:`;
- every command an absolute path, with no arguments and no wildcards, so `ALL` and
  `systemctl *` are both out;
- each path under `/usr/bin`, `/usr/sbin`, `/usr/local/sbin`, `/bin` or `/sbin`, present on
  the host, owned by root and not group- or world-writable — a grant on a binary somebody
  else can rewrite is a grant on whatever they write;
- nothing under the deploy tree, which `cloud-deploy` controls;
- `visudo -cf` last, because a malformed file in `/etc/sudoers.d/` breaks sudo host-wide.

Ownership is checked with `stat -L`: most of these paths are symlinks, and a symlink's own
mode is always `0777`, which says nothing about the binary behind it.

Widening the grant still takes a reviewed commit. The installer only decides whether what
was committed is *shaped* safely, never whether it should have been asked for.

### Why the Caddyfile is installed through a wrapper

`/etc/caddy/Caddyfile` is the one piece of the reverse proxy nobody generates: it carries
the `ws.cloud.marppa.com` site the UI's WebSocket goes through, and the
`import sites/*.caddy` line that pulls in every portal. Everything under `sites/` belongs to
cloud-scripts, which writes one file per portal and reloads Caddy on its own.

That split is what the installer has to preserve. It syncs **only** the top-level file and
never touches `sites/`: a `--delete` sync over that directory would drop every live portal
between two deploys, and the app would only put them back on the next portal event.

`install-cloud-script-caddyfile.sh` refuses a config that drops `import sites/*.caddy` —
without it Caddy still starts, still serves the WebSocket, and every customer portal quietly
stops answering. It also refuses absolute `import` paths, keeping the config to the tree it
owns.

Validation runs on a candidate written **inside `/etc/caddy`**, because Caddy resolves
import globs relative to the config's own directory: from `/tmp` the portals would not be
imported and a conflict with a live portal would slip through. If the reload fails anyway,
the previous file is restored from `Caddyfile.marppa.bak` and Caddy is reloaded again, so a
bad deploy cannot leave the proxy down.

An empty `sites/` is not an error — a host with no portals yet still starts.

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

sudo install -m 0755 -o root -g root \
  /opt/cloud-script/marppa-cloud/apps/cloud-scripts/deploy/install-cloud-script-sudoers.sh \
  /usr/local/sbin/install-cloud-script-sudoers.sh

sudo install -m 0755 -o root -g root \
  /opt/cloud-script/marppa-cloud/apps/cloud-scripts/deploy/install-cloud-script-caddyfile.sh \
  /usr/local/sbin/install-cloud-script-caddyfile.sh

sudo visudo -cf /opt/cloud-script/marppa-cloud/apps/cloud-scripts/deploy/cloud-script-deploy.sudoers
sudo install -m 0440 -o root -g root \
  /opt/cloud-script/marppa-cloud/apps/cloud-scripts/deploy/cloud-script-deploy.sudoers \
  /etc/sudoers.d/cloud-script-deploy
```

Both installers must live outside the deploy tree. Under `/opt` they would be
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

## Certificate distribution

Caddy owns every certificate on this host: it issues them, renews them, and keeps them
under `/var/lib/caddy/.local/share/caddy/certificates/<acme-directory>/<domain>/` as
`<domain>.crt` (fullchain) and `<domain>.key`, mode `0600` `caddy:caddy`. Processes that
are not Caddy — an atom that wants TLS on its own port, a service on a VM — cannot read
that directory and have no way to learn that a renewal happened.

`sync-marppa-certs.sh` is the distributor. It reads a manifest of destinations, copies
each certificate to each one, and runs that destination's reload command **only when the
file's content actually changed**. It is not about Redis and knows nothing about atoms:
a destination is a path on a machine plus the permissions the consumer needs.

### The manifest

`deploy/cert-targets.json`, installed on the host as `/etc/marppa/cert-targets.json`:

```json
{
  "store": "/var/lib/caddy/.local/share/caddy/certificates/acme-v02.api.letsencrypt.org-directory",
  "sshKey": "/root/.ssh/marppa-cert-sync",
  "targets": [
    {
      "domain": "host.cloud.marppa.com",
      "host": "local",
      "path": "/etc/marppa/certs/host.cloud.marppa.com",
      "owner": "999:999",
      "dirMode": "0750",
      "certMode": "0644",
      "keyMode": "0640",
      "reload": "/usr/bin/docker restart a-cfeb4c"
    },
    {
      "domain": "api.stg.enlagondola.com",
      "host": "10.0.0.2",
      "path": "/srv/elg/certs",
      "owner": "1000:1000",
      "reload": "cd /srv/elg && docker compose restart api"
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `store` | Caddy's certificate directory. Resolve it per host — the layout differs between a package install and a container. `find /var/lib/caddy /home/caddy -type d -name "<domain>"` |
| `sshKey` | Private key root uses to reach every remote destination. Defaults to `/root/.ssh/marppa-cert-sync` |
| `domain` | Subdirectory in the store, and the basename of both files at the destination |
| `host` | `local` for a path on the home-server itself (no ssh at all), otherwise the address the sync connects to as `root` |
| `path` | Destination directory, created if absent |
| `owner` | `uid:gid` the destination files get. Required, no default |
| `dirMode` / `certMode` / `keyMode` | Octal. Default `0750` / `0644` / `0640` |
| `reload` | Shell command run on the destination when a file changed. Empty means nothing to reload |

### Permissions are the part that bites

Caddy writes `0600 caddy:caddy`. Most containers run as a non-root user — `redis:7-alpine`
is uid/gid 999 — so a key copied verbatim is unreadable inside the container and the
process dies at startup. The answer is **not** `0644` on a private key. Each destination
declares the `owner` its consumer actually runs as, and the key lands `0640` owned by
that uid, group-readable only. The `.crt` is public and stays `0644`.

`owner` is deliberately required. A default would be a default private-key owner, which
is exactly the value nobody should get wrong silently.

### Why the reload is conditional

The destinations are live services. Redis in particular does not reload certificates in
place, so the reload command has to restart the container — which means a sync that
reloaded unconditionally would bounce every TLS consumer on the host once a day for no
reason.

Change detection is `rsync --checksum --itemize-changes`: content is compared by hash, and
only an itemized line starting with `>f` (a file actually transferred) counts as a change.
An owner or mode correction itemizes as `.f...og...` and deliberately does **not** fire the
reload.

### SSH requirement for remote destinations

Every remote destination needs root-to-root SSH from the home-server, because only root at
the far end can `chown` the key to an arbitrary uid:

```bash
sudo ssh-keygen -t ed25519 -N '' -f /root/.ssh/marppa-cert-sync -C marppa-cert-sync
sudo cat /root/.ssh/marppa-cert-sync.pub
# append to /root/.ssh/authorized_keys on each destination
```

A missing key, an unreachable host or a certificate Caddy has not issued yet are reported
on stderr and make the run exit non-zero, so a broken destination shows up as a failed
unit in `systemctl status` instead of a certificate that quietly stopped being delivered.
One failing destination does not stop the others.

Restrict the key at the far end (`command=`, `from=`) if the destination is not fully
trusted — the grant as written is unrestricted root.

### Schedule

`marppa-cert-sync.timer` runs the sync daily with a 30-minute jitter and `Persistent=true`,
so a host that was off at the scheduled time catches up on boot. Daily is far more often
than Let's Encrypt's 60-day renewal, which is the point: the run is a cheap no-op on every
day but the one that matters.

### Install

```bash
sudo install -m 0755 -o root -g root \
  /opt/cloud-script/marppa-cloud/apps/cloud-scripts/deploy/sync-marppa-certs.sh \
  /usr/local/sbin/sync-marppa-certs.sh

sudo install -d -m 0755 -o root -g root /etc/marppa
sudo install -m 0640 -o root -g root \
  /opt/cloud-script/marppa-cloud/apps/cloud-scripts/deploy/cert-targets.json \
  /etc/marppa/cert-targets.json

sudo install -m 0644 -o root -g root \
  /opt/cloud-script/marppa-cloud/apps/cloud-scripts/deploy/marppa-cert-sync.service \
  /etc/systemd/system/marppa-cert-sync.service
sudo install -m 0644 -o root -g root \
  /opt/cloud-script/marppa-cloud/apps/cloud-scripts/deploy/marppa-cert-sync.timer \
  /etc/systemd/system/marppa-cert-sync.timer

sudo systemctl daemon-reload
sudo systemctl enable --now marppa-cert-sync.timer
sudo systemctl start marppa-cert-sync.service   # first run, watch the output
```

The script and the manifest are installed by hand and **not** by the deploy pipeline, unlike
the unit, the sudoers file and the Caddyfile. Those three go through validating wrappers
precisely because `cloud-deploy` controls the deploy tree; the manifest has no equivalent
validation, and it holds a `reload` command that root executes. Syncing it from `/opt`
would hand `cloud-deploy` a root shell. Changing a destination is therefore a reviewed
commit plus one `install` run as `nvillar`.

### Consumers inside atoms

An `AtomImage` declares `certMountPoint`, the container path where it expects TLS material.
When it is set, `startAtom` adds

```
--mount type=bind,source=$ATOM_CERT_ROOT/$ATOM_CERT_DOMAIN,destination=<certMountPoint>,readonly
```

so the image finds `<domain>.crt` and `<domain>.key` under that path. An image that does not
serve TLS leaves the field empty and gets no mount. This is the one bind mount atoms have:
everything else is an LVM-backed `AtomVolume`.

`ATOM_CERT_DOMAIN` is a host-wide setting rather than a per-atom field because an atom is
reached from outside through a fiber, i.e. a DNAT rule on the host's own public name — so
the certificate that validates is the host's, not the tenant's. A per-atom override belongs
here the day an atom is published under a name of its own.

Starting an atom whose image declares `certMountPoint` fails with a named error if
`ATOM_CERT_DOMAIN` is unset or the directory has not been delivered yet, rather than starting
a container whose TLS listener will not bind.

The manifest's `reload` for such a target has to **restart the container**, not signal it:
Redis in particular reads its certificate once at startup and never again. Atom ids are
generated per host, so that reload line is host-specific — it belongs in the installed
`/etc/marppa/cert-targets.json`, not necessarily in the version committed here.

### Turning TLS on for an atom

Worth adding a **separate** catalog entry rather than editing the shared image: the flags
below take the plaintext listener away, and every atom on that image inherits them.

1. In the catalog admin, add an image (e.g. `redis-tls`, `redis:7-alpine`) with
   **Certificate mount point** `/certs` and a command of

   ```
   redis-server
   --port 0
   --tls-port 6379
   --tls-cert-file /certs/<domain>.crt
   --tls-key-file /certs/<domain>.key
   --tls-auth-clients no
   ```

   `--port 0` is what closes the plaintext listener; without it the atom answers both and
   the exercise bought nothing. `--tls-auth-clients no` avoids issuing client certificates.
   Some Redis builds also want `--tls-ca-cert-file` pointing at the same `.crt`.

2. Set `ATOM_CERT_DOMAIN` in the host's `.env.local` and add a destination to
   `/etc/marppa/cert-targets.json` with `owner` `999:999` (the uid `redis:7-alpine` runs as)
   and a `reload` that restarts the atom.

3. `--tls-port` is the port **inside** the container. The public port comes from the fiber's
   DNAT rule and is unrelated; the rewrite happens at the IP layer, below TLS, so a client
   dialing the host by name still validates the certificate.

## Secrets / `.env`

Nothing goes into GitHub secrets. The host keeps its own
`apps/cloud-scripts/.env.local` (mode 600, owned by `cloud-script`), and the
sync excludes `**/.env*`, so it is never touched or overwritten. For a
self-hosted runner on the same machine this is the safer choice — secrets never
leave the host. Only render env from a secret in CI if you move to a runner that
does not already hold the file; you don't need it here.

## Service hardening

The unit sets `ProtectHome=yes` and `ProtectSystem=yes`. The service holds a
broad sudo grant, so these narrow what a compromised worker reaches: `/home`
becomes invisible and `/usr` and `/boot` become read-only.

**`ProtectSystem` must stay at `yes`.** The worker rewrites `/etc/nftables.conf`,
the dnsmasq configs and the systemd network units, and only `yes` leaves `/etc`
writable — `full` adds `/etc` to the read-only set, and `strict` covers the whole
filesystem. Setting it to `full` on 2026-08-07 broke every nftables write with

```
Command "sudo install -m 600 /tmp/nftables-<ts>.conf /etc/nftables.conf" failed with code 1
```

and each failing event left the live ruleset and the database out of step: an
`nft add rule` had already landed while the row stayed `FAILED`. The orphan DNAT
then blocked its own replacement, because the port allocator reads the live
ruleset to decide whether a target is free.

Two more options are deliberately absent:

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
