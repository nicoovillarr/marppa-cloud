# Cloud Scripts

Infrastructure event worker. It consumes events from the BullMQ queue the backend
publishes to and applies them on the host: zone bridges (`ip link` + dnsmasq +
nftables), worker VMs (libvirt/KVM + cloud-init), fibers (DNAT) and portals (nginx).

It never exposes a REST API — the backend is the only writer of commands, the DB is
the shared state, and Redis is the transport. It **must** run on the Linux host that
owns the bridges and the VMs.

---

## 1. Requirements

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

```bash
sudo tee /etc/sudoers.d/cloud-scripts > /dev/null <<EOF
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

sudo chmod 440 /etc/sudoers.d/cloud-scripts
sudo visudo -c -f /etc/sudoers.d/cloud-scripts   # must print "parsed OK"
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

flush ruleset

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

```bash
# From the repo root
npm ci
npm run build:shared          # packages/db, api-types, shared → dist
npm run prisma:generate       # Prisma client for back and cloud-scripts

# Migrations (run once per database, from either app)
cd apps/back && npx prisma migrate deploy

# Seed: root company, root user, worker families/flavors and the Ubuntu cloud image
npm run prisma:seed

# Build and start the worker
cd ../cloud-scripts
npm run build
npm start
```

`npm start` uses `scripts/register-aliases.js` to resolve the `@/...` path aliases at
runtime — `node dist/index.js` on its own does not work. For development use
`npm run dev` (ts-node) or `npm run dev:watch`.

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
