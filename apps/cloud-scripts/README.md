# Cloud Scripts

Infrastructure event worker. It consumes events from the BullMQ queue the backend
publishes to and applies them on the host: zone bridges (`ip link` + dnsmasq +
nftables), worker VMs (libvirt/KVM + cloud-init), fibers (DNAT) and portals (nginx).

It never exposes a REST API — the backend is the only writer of commands, the DB is
the shared state, and Redis is the transport. It **must** run on the Linux host that
owns the bridges and the VMs.

---

## 1. Requirements

### Two ways to run it — decide first

Everything below assumes one of these, and they differ in **which Unix user owns the
setup**:

| | Development | Service |
|---|---|---|
| How | `npm run dev` from a clone anywhere | systemd unit, `/opt/cloud-script/marppa-cloud` |
| Runs as | your own login user (`$USER`) | a dedicated `cloud-script` account |
| Setup | §1 as written, then §3.1 | §1 substituting the user, then §3.2 |

The app shells out through `sudo` for `ip`, `nft`, `virsh` and friends, so **the
passwordless sudo grant must name the user the process actually runs as**. That is the
single thing people get wrong: they follow §1 as `$USER`, then install the systemd unit
and the service dies in the preflight because `cloud-script` has no sudo.

The startup preflight cannot catch this for you — it runs `sudo -n true` as whoever
started the process, so it validates the identity it happens to have, not the one you
intended.

If you want the service, you can go straight to §3.2: it repeats every §1 step with the
right ownership.

### Host

| Requirement | Notes |
|---|---|
| Linux with systemd | Ubuntu 22.04/24.04 server. `systemd-networkd` is used to persist zone bridges. |
| KVM | `/dev/kvm` present, virtualization enabled in BIOS. |
| Node.js | 20 LTS or newer (tested on 22). |
| PostgreSQL | Same database as the backend. |
| Redis / Valkey | Same instance as the backend (`REDIS_URL`). |
| Internet access | Only to download the base cloud image and bake packages into it. VMs do not need it at first boot. |

WSL2 works for application logic and VM lifecycle, but **not** for reaching VMs from
the LAN: its network lives inside a Hyper-V NAT. Use a real host for the end-to-end
flow. See `WINDOWS_DEV.md` for the WSL setup.

### Packages

```bash
sudo apt update && sudo apt install -y \
  qemu-kvm libvirt-daemon-system libvirt-clients virtinst \
  libguestfs-tools genisoimage qemu-utils \
  dnsmasq nftables iproute2 \
  nmap ipcalc net-tools wget curl
```

`virt-customize` comes from `libguestfs-tools`, `arp` from `net-tools`, `networkctl`
from systemd. The startup preflight lists anything missing.

### System users, directories and permissions

`$USER` below is the account the app will run as. For a service install replace every
occurrence with `cloud-script` — or just follow §3.2, which does exactly that.

```bash
# libvirt access for the user running this app
sudo usermod -aG libvirt,kvm $USER
sudo systemctl enable --now libvirtd systemd-networkd nftables

# Image and cloud-init working directories (owned by the app user)
sudo mkdir -p /var/lib/libvirt/images /var/lib/libvirt/cloud-init
sudo chown -R $USER:libvirt /var/lib/libvirt/images /var/lib/libvirt/cloud-init
sudo chmod 775 /var/lib/libvirt/images /var/lib/libvirt/cloud-init

# Config directories the app writes through sudo
sudo mkdir -p /etc/dnsmasq.d /etc/systemd/network /etc/nft-backups
sudo chmod 755 /etc/nft-backups

# Log directory (if LOG_DIR points elsewhere, create that one instead)
mkdir -p ./.logs
```

The process runs **unprivileged**: every file under `/etc` is written via
`sudo install`, never directly. Do not run the app as root.

### Passwordless sudo

The grant below names `$USER`. **It must name whoever runs the process.** For a service
install the repo ships the same rule already written for `cloud-script` —
`deploy/cloud-scripts.sudoers`, installed in §3.2 — and it lands on the same
`/etc/sudoers.d/cloud-scripts` path, so the two replace each other rather than stacking.
If you run both ways on one host, grant both users.

Never write into `/etc/sudoers.d` directly. A truncated line or an indented heredoc
terminator leaves a malformed file, and sudo then refuses **every** invocation
host-wide — including the one you would use to fix it. Write a copy, validate it with
`visudo -c`, and only then install it. Keep a second terminal with an open root shell
(`sudo -i`) while you do it.

```bash
tee /tmp/cloud-scripts.sudoers > /dev/null <<EOF
$USER ALL=(ALL) NOPASSWD: \
  /usr/bin/virsh, \
  /usr/bin/virt-install, \
  /usr/bin/virt-customize, \
  /usr/bin/guestfish, \
  /usr/bin/genisoimage, \
  /usr/bin/qemu-img, \
  /usr/sbin/ip, \
  /usr/bin/networkctl, \
  /usr/sbin/nft, \
  /usr/sbin/sysctl, \
  /usr/bin/systemctl, \
  /usr/sbin/nginx, \
  /usr/bin/pkill, \
  /usr/bin/cat, \
  /usr/bin/cp, \
  /usr/bin/mv, \
  /usr/bin/rm, \
  /usr/bin/mkdir, \
  /usr/bin/install, \
  /usr/bin/chown, \
  /usr/bin/chmod, \
  /usr/local/sbin/reset-dnsmasq.sh
EOF

sudo visudo -cf /tmp/cloud-scripts.sudoers       # must print "parsed OK" — stop if it does not
sudo install -m 0440 -o root -g root /tmp/cloud-scripts.sudoers /etc/sudoers.d/cloud-scripts
rm /tmp/cloud-scripts.sudoers

sudo -n true && echo "passwordless sudo OK"      # preflight checks this
```

Adjust the paths to whatever `which <binary>` reports on your host (on non-usr-merged
systems some live in `/bin`). A single missing entry makes the app hang on a password
prompt.

### nftables base ruleset

The app appends rules to chains it assumes exist; it never creates the base ruleset.

```bash
sudo tee /etc/nftables.conf > /dev/null <<'EOF'
#!/usr/sbin/nft -f

add table inet filter
delete table inet filter
add table ip nat
delete table ip nat

table inet filter {
  chain input   { type filter hook input   priority 0; policy accept; }
  chain forward { type filter hook forward priority 0; policy accept; }
  chain output  { type filter hook output  priority 0; policy accept; }
}

table ip nat {
  chain prerouting  { type nat hook prerouting  priority -100; }
  chain postrouting { type nat hook postrouting priority 100; }
}
EOF

sudo nft -f /etc/nftables.conf

# Pristine copy restored by SYSTEM_RESET → this path goes in NFTABLES_RESET_SOURCE
sudo cp /etc/nftables.conf /etc/nftables.base.conf
```

**Do not put `flush ruleset` in either file.** It is the obvious way to make a ruleset
re-applicable, and it is wrong here: it wipes *every* table on the host, including ones
this app does not own — fail2ban's `f2b-table`, libvirt's, docker's. Whoever owns them
is not notified and keeps assuming its rules are in place.

The `add`/`delete` pair above replaces it, scoped to the two tables this app owns. The
`add` is a no-op when the table exists and creates an empty one when it does not, so the
`delete` never fails on a fresh host. Applied with a single `nft -f`, the whole file is
one atomic transaction.

The startup preflight rejects a base ruleset that declares any other table, and the app
strips a stray `flush ruleset` at runtime rather than applying it — but the file is
yours, so keep it correct at the source.

### Coexisting with fail2ban and other nftables users

This app owns exactly two tables: `inet filter` and `ip nat`. It never flushes the
ruleset, and it persists only those two into `/etc/nftables.conf`, so anything else on
the host survives every zone, fiber and reset operation.

Two caveats worth knowing before adding another nftables user:

- `ip nat` is a **shared name**: the `iptables-nft` shim uses it too. If libvirt brings
  up a NAT network or docker starts, their rules land in that table and a `SYSTEM_RESET`
  will take them with it. `inet filter` has the same exposure with anything writing to
  the standard filter table.
- Rules you add by hand to `inet filter` or `ip nat` are persisted by the app, but a
  `SYSTEM_RESET` recreates both tables from `NFTABLES_RESET_SOURCE`. Anything that must
  survive a reset — rate limiting, extra accepts — belongs in that file, not in the live
  ruleset.

fail2ban with `banaction = nftables-multiport` needs no special handling: it creates its
own `inet f2b-table` at a lower hook priority, so its bans are evaluated before this
app's rules and neither side touches the other's tables.

### dnsmasq

Zone DHCP/DNS is written as drop-ins in `/etc/dnsmasq.d`, one file per zone.

```bash
# The app starts/restarts dnsmasq itself; it must not fight with the boot unit
sudo systemctl disable dnsmasq

grep -q '^conf-dir=/etc/dnsmasq.d' /etc/dnsmasq.conf \
  || echo 'conf-dir=/etc/dnsmasq.d/,*.conf' | sudo tee -a /etc/dnsmasq.conf

sudo tee /usr/local/sbin/reset-dnsmasq.sh > /dev/null <<'EOF'
#!/bin/bash
rm -f /var/lib/dnsmasq/dnsmasq.leases
rm -f /tmp/dnsmasq.leases
EOF
sudo chmod +x /usr/local/sbin/reset-dnsmasq.sh
```

### IP forwarding

Nothing to do: the app enables `net.ipv4.ip_forward` at startup and persists it in
`/etc/sysctl.d/99-cloud-scripts.conf` (this is why `sysctl` is in the sudoers list).

---

## 2. Environment variables

Loaded from, in order: `.env.$NODE_ENV.local`, `.env.local`, `.env.$NODE_ENV`, `.env`.
Copy `.env.template` and fill it in. Everything below is validated at startup — the
process refuses to boot with a list of what is wrong.

| Variable | Required | Meaning |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string. Same DB as the backend. |
| `DB_CA` | no | CA certificate **contents** (inline PEM) for TLS. Note the backend uses `DB_CA_ROUTE`, a file path. |
| `REDIS_URL` | yes | BullMQ queue. **Must be the same instance the backend points to**, or events are published into the void. |
| `WS_PORT` | yes | Port for the WebSocket server that pushes resource updates to the UI. |
| `JWT_SECRET` | yes | Must be **identical** to the backend's: WS clients authenticate with the backend's access token. |
| `BRIDGE_NAME` | yes | Host **uplink** interface (e.g. `enp3s0`, `br0`) — the one facing your LAN. NAT, fibers (DNAT) and the RFC1918 exceptions hang off it. Not a zone bridge. |
| `USERNAME` | yes | Unix user running the app; used when editing images with guestfish. |
| `MIN_PORT` / `MAX_PORT` | yes | Host port range fibers allocate from (e.g. `30000` / `40000`). |
| `NFTABLES_RESET_SOURCE` | yes | Path to the pristine base ruleset (`/etc/nftables.base.conf` above). Restored by `SYSTEM_RESET`. |
| `ALLOWED_IMAGE_DOMAINS` | yes | Comma-separated allowlist of hosts images may be downloaded from, e.g. `cloud-images.ubuntu.com`. |
| `WORKER_BOOT_TIMEOUT_MS` | no | How long to wait for a VM's first boot before declaring it unreachable. Default `180000`. |
| `LOG_DIR` | no | Log directory. Omit to log only to stdout. |
| `MAX_LOG_SIZE`, `LOG_BACKUP_COUNT` | no | Log rotation. Defaults: 10 MB, 5 files. |
| `USE_STUBS` | no | `true` replaces every host service with a no-op stub **and skips the preflight**. Development only — never set it on the host. |
| `NODE_ENV` | no | Selects the `.env` cascade. |

---

## 3. Install and run

### 3.1 Development

Runs as your own login user, from a clone anywhere. Requires §1 done as `$USER`.

```bash
# From the repo root
npm ci
npm run build:shared          # packages/db, api-types, shared → dist
npm run prisma:generate       # Prisma client for back and cloud-scripts

# Migrations (run once per database, from either app)
cd apps/back && npx prisma migrate deploy

# Seed: root company, root user, worker families/flavors and the Ubuntu cloud image
npm run prisma:seed

# Start the worker
cd ../cloud-scripts
npm run dev                   # ts-node; npm run dev:watch to reload on change
```

To run the compiled build instead, `npm run build && npm start`. `npm start` goes
through `scripts/register-aliases.js` to resolve the `@/...` path aliases at runtime —
`node dist/index.js` on its own does not work.

### 3.2 Running as a service

Runs as a dedicated `cloud-script` account out of `/opt/cloud-script/marppa-cloud`,
which is what `deploy/cloud-script.service` and `deploy/cloud-scripts.sudoers` assume.
Do **not** do §1 as `$USER` and then this — the sudo grant would name the wrong user.

```bash
# 1. Service account, with /opt/cloud-script as its home
sudo useradd -m -d /opt/cloud-script -s /bin/bash cloud-script
sudo usermod -aG libvirt,kvm cloud-script

# 2. Host state from §1, owned by the service user
sudo mkdir -p /var/lib/libvirt/images /var/lib/libvirt/cloud-init
sudo chown -R cloud-script:libvirt /var/lib/libvirt/images /var/lib/libvirt/cloud-init
sudo chmod 775 /var/lib/libvirt/images /var/lib/libvirt/cloud-init
sudo mkdir -p /etc/dnsmasq.d /etc/systemd/network /etc/nft-backups
sudo chmod 755 /etc/nft-backups

# 3. Code, built as the service user
sudo -u cloud-script -H git clone <your-fork> /opt/cloud-script/marppa-cloud
cd /opt/cloud-script/marppa-cloud
sudo -u cloud-script -H npm ci
sudo -u cloud-script -H npm run prisma:generate -w marppa-cloud-scripts
sudo -u cloud-script -H npm run build:shared
sudo -u cloud-script -H npm run build -w marppa-cloud-scripts
sudo -u cloud-script -H mkdir -p apps/cloud-scripts/.logs

# 4. Config — secrets, so 600 and owned by the service user only
sudo -u cloud-script cp apps/cloud-scripts/.env.template apps/cloud-scripts/.env.local
sudo -u cloud-script chmod 600 apps/cloud-scripts/.env.local
sudo -u cloud-script nano apps/cloud-scripts/.env.local    # fill it per §2
```

Set `USERNAME=cloud-script` in that file: it is the account `guestfish` edits images as,
and it has to match the user the process runs under.

Then the two privileged pieces. The sudo grant replaces the `$USER` one from §1 (same
destination path), and the unit is the one the service boots from:

```bash
# 5. Passwordless sudo for the SERVICE user
sudo visudo -cf apps/cloud-scripts/deploy/cloud-scripts.sudoers   # must print "parsed OK"
sudo install -m 0440 -o root -g root \
  apps/cloud-scripts/deploy/cloud-scripts.sudoers /etc/sudoers.d/cloud-scripts
sudo -l -U cloud-script            # lists what the service user may run, NOPASSWD

# 6. systemd unit
sudo install -m 0644 -o root -g root \
  apps/cloud-scripts/deploy/cloud-script.service /etc/systemd/system/cloud-script.service
sudo systemctl daemon-reload
sudo systemctl enable --now cloud-script

systemctl status cloud-script
journalctl -u cloud-script -f
```

The binary paths in `cloud-scripts.sudoers` are host-specific — sudo resolves each bare
command through its `secure_path`, so `ip`/`nft`/`sysctl` land under `/usr/sbin` on a
usr-merged system and elsewhere otherwise. If a command comes back as `command not
allowed` at runtime, the sudo log line names the path that was actually resolved; fix
the file to match. Step 5's `sudo -l -U cloud-script` shows the grant as sudo resolved
it, which catches a wrong user or a bad path before the service ever starts.

Once this works and you want pushes to deploy themselves, `deploy/README.md` covers the
self-hosted GitHub Actions runner, which builds on exactly this layout.

A healthy boot looks like this:

```
[LOG] IP forwarding is disabled (net.ipv4.ip_forward=0); enabling it.
[LOG] Host preflight checks passed.
[INFO] [WebSocketServer] Listening on port 8081
[INFO] [EventWorker] Worker started (concurrency: 10)
[INFO] [Main] Infrastructure event worker is running.
```

If the preflight fails it prints every problem with its remediation and exits — fix
them all and start again.

### Backend side (must match)

- `REDIS_URL` pointing at the same Redis, `DATABASE_URL` at the same database, and the
  same `JWT_SECRET`.
- Over plain HTTP (no TLS on a homelab), set `COOKIE_SECURE=false`, otherwise the auth
  cookies are dropped by the client and every call after login returns 401.
- The frontend calls the API under `/api`; if you hit the backend port directly, the
  refresh cookie (path `/api/auth`) is not sent, so the session simply expires after
  15 minutes and you log in again.

---

## 4. End-to-end flow

Each step is asynchronous: the API returns immediately and the resource walks
`QUEUED → PROVISIONING → ACTIVE|FAILED`. Wait for the terminal status before the next
step (`GET` the resource, or watch the WebSocket).

| # | Call | Waits for | Result on the host |
|---|---|---|---|
| 1 | `POST /mesh/zones` `{"name":"lab","cidr":"10.10.0.0/24"}` | zone `ACTIVE` | bridge `z-xxxxxx` up with `10.10.0.1/24`, dnsmasq drop-in, nft rules |
| 2 | `POST /hive/workers` `{"name":"web-01","imageId":1,"flavorId":1,"publicSSH":"ssh-ed25519 ..."}` | worker `INACTIVE` | base image downloaded + packages baked (first time only, slow), disk resized, domain defined |
| 3 | `POST /mesh/zones/{zoneId}/nodes` `{"workerId":"w-xxxxxx"}` | node `ACTIVE` | IP reserved, cloud-init seed rearmed with the static IP, NIC attached to the bridge |
| 4 | `POST /hive/workers/{id}/start` | worker `ACTIVE` | VM booted and answering ping on its IP |
| 5 | `POST /mesh/zones/{zoneId}/nodes/{nodeId}/fibers` `{"protocol":"tcp","targetPort":80}` | fiber `ACTIVE` | DNAT from `<host>:<hostPort>` to the VM |

Step 2 is the slow one: the first worker downloads the Ubuntu cloud image and runs
`virt-customize` on it (minutes). Later workers reuse the prepared image.

The API validates the preconditions of each step, so a call out of order fails
immediately with a clear message instead of retrying inside a processor.

### Reaching the VM from another network

**Fibers (default).** The fiber's `hostPort` is returned by the API; from any machine
on your LAN, `http://<host-ip>:<hostPort>` reaches the VM's port. Nothing to configure
on the client — conntrack rewrites the reply, so the client only ever talks to the
host's IP.

**Direct routing (optional).** The host deliberately does *not* masquerade traffic
from a zone towards RFC1918 destinations, so VMs answer with their real `10.10.x.y`
address. A client can then talk to them directly with one static route:

```powershell
# Windows, as Administrator — <host-ip> is the machine running cloud-scripts
route add 10.0.0.0 mask 255.0.0.0 <host-ip>
```

```bash
# Linux
sudo ip route add 10.0.0.0/8 via <host-ip>
```

One route covers every present and future zone. Without it the VM's replies are
dropped by the client, which is why fibers are the default for a first test.

### Teardown order

`DELETE` of a worker-backed node unassigns the worker (removes the reservation and the
NIC) but keeps the row; the zone refuses to be deleted while nodes exist. Full
teardown: terminate worker → delete node (unassign) → delete node again (removes the
row) → delete worker → delete zone.

`SYSTEM_RESET` wipes every VM, zone and portal on the host and restores
`NFTABLES_RESET_SOURCE`. It runs the same preflight first.

---

## 5. What lives where on the host

| Path | Written by | Content |
|---|---|---|
| `/etc/systemd/network/10-z-*.netdev` / `.network` | zone create | bridge device + address, persisted across reboots |
| `/etc/dnsmasq.d/z-*.conf` | zone create / node assign | DHCP range and `mac→ip` reservations |
| `/etc/nftables.conf` | any nft change | live ruleset, saved after each change |
| `/etc/nft-backups/` | nft changes | timestamped backups, restored if a rule set fails to apply |
| `/var/lib/libvirt/images/<os>-<family>-<version>.img` | worker create | shared base image (`.prepared` marker next to it) |
| `/var/lib/libvirt/images/w-*.img` | worker create | per-worker disk |
| `/var/lib/libvirt/cloud-init/w-*/` | worker create / node assign | `user-data`, `meta-data`, `network-config`, `seed-*.iso` |
| `/etc/sysctl.d/99-cloud-scripts.conf` | startup | `net.ipv4.ip_forward=1` |

---

## 6. Troubleshooting

**The app exits at startup with a list of problems.** That is the preflight. Every line
says what is missing and how to fix it. It also runs before `SYSTEM_RESET`.

**Everything stays `QUEUED` and nothing happens.** The backend and cloud-scripts are on
different Redis instances, or cloud-scripts is not running. Check
`redis-cli -u $REDIS_URL llen bull:infrastructure-events:wait`.

**A resource ends in `FAILED`.** Look for `Error processing event ID <n>` in the log; the
event row also keeps `retries` and `failedAt`. Events retry 5 times with exponential
backoff before failing definitively; retries are idempotent (a half-created zone or VM
is cleaned up before the next attempt).

**The VM boots but is unreachable.** `WorkerStartProcessor` dumps bridge and VM
diagnostics when the first ping fails. Check that the vnet is attached
(`ip link show master z-xxxxxx`), that dnsmasq is running, and that the base image was
prepared (`ls /var/lib/libvirt/images/*.prepared`).

**`sudo` asks for a password.** A binary is missing from `/etc/sudoers.d/cloud-scripts`.
The error names the exact command.

---

## 7. Architecture notes

### Event flow

The backend writes an `Event` row (plus `EventResource` rows: one `PRIMARY`, at most one
`PARENT`, any number of `RELATED`) and pushes the id onto a per-resource FIFO in Redis.
Only the head of each FIFO becomes a BullMQ job, so operations on the same resource are
serialized while different resources run in parallel (concurrency 10).

`EventWorker` resolves the processor for the event type and:

- defers the job (exponential, capped at 30 s) while the `PARENT` resource is still in a
  transient status;
- aborts with the matching `*_FAILED` event if the parent failed or is missing;
- on success marks the event processed and advances the resource FIFO;
- on error increments `retries` and lets BullMQ retry (5 attempts), then marks it failed
  and cascades the failure to children.

### State machine

`packages/api-types/src/event-state-machine.ts` is the single source of truth: the
backend sets `entry` before dispatching, the processor validates `entry`, moves to
`work`, and finishes in `ok` or `fail`. cloud-scripts reads it through
`@/shared/domain/EventStateMachine`, which casts the twin api-types/Prisma enums in one
place.

### AppContainer — DI container internals

`src/libs/Container.ts` wires the application using [Awilix](https://github.com/jeffijoe/awilix)
in `PROXY` injection mode. Entry point is `AppContainer.build()`, which returns
`{ container, modules, lifecycleProviders }`.

**Token key mapping.** Awilix requires string keys. Symbols and class constructors used
as `ProviderToken`s are mapped to stable string keys via identity-based maps (`_symKeys`,
`_clsKeys`) — never by name or description, so minification and duplicate class names are
safe. `_freshKey()` generates internal keys for registrations with no external token
(processors, module instances); it must never be used for `ProviderToken`s. `REGISTRY_KEY`
is the stable key for `ProcessorRegistry`.

**Parameter resolution (`_resolveParamTokens`).** All constructor parameters are injected.
Token sources, in priority order: `@Inject(token)` per-param annotation, then the
`design:paramtypes` reflected type (requires `emitDecoratorMetadata`). If a reflected type
resolves to `Object`, the TypeScript type was erased at runtime (interface, type alias,
generic, `any`) and the error tells you to add `@Inject(token)`. Parameter count is
`max(reflected length, highest @Inject index + 1)`.

**Class resolver (`_makeClassResolver`).** Uses Awilix `PROXY` mode: each `asFunction`
factory receives the full cradle as its single argument, and dependencies are looked up by
string key explicitly. `CLASSIC` mode would destructure by parameter name, which conflicts
with token-keyed resolution.

**Module graph collection (`_buildGraph`).** Walks the module import tree depth-first,
collecting providers, processors and sub-modules. Keys are generated during the traversal
so `_validateGraph` sees the complete registration picture before any Awilix registration.
The root module is never instantiated as a sub-module.

**Validation (`_validateGraph`).** Runs before any registration and checks: no duplicate
provider tokens, no duplicate processors for the same event type, every constructor
parameter refers to a known token, and no circular provider dependencies (three-color DFS).
Known tokens are all registered provider tokens plus `REGISTRY_KEY`; processors and
sub-modules have no external token and are excluded. `useFactory` providers are excluded
from static analysis — their closures are opaque.

**Bootstrap order (`build`).** Collect and validate the graph → register providers →
resolve processors and hand them to `ProcessorRegistry` → register and resolve sub-modules
→ return the bootstrap. `index.ts` then runs the host preflight, calls `onModuleInit` on
every lifecycle provider, and starts the modules.
