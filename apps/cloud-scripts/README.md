# Cloud Scripts

Infrastructure event worker. It consumes events from the BullMQ queue the backend
publishes to and applies them on the host: zone bridges (`ip link` + dnsmasq +
nftables), worker VMs (libvirt/KVM + cloud-init), fibers (DNAT) and portals (Caddy).

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
| Inbound 80/443 | Portals only. Caddy's automatic ACME needs the host reachable on both from the internet, or no certificate is ever issued. |
| Docker | Atoms only, and it must be configured before its first start — § *Docker (atoms)*. |

WSL2 works for application logic and VM lifecycle, but **not** for reaching VMs from
the LAN: its network lives inside a Hyper-V NAT. Use a real host for the end-to-end
flow. See `WINDOWS_DEV.md` for the WSL setup.

### Packages

```bash
sudo apt update && sudo apt install -y \
  qemu-kvm libvirt-daemon-system libvirt-clients virtinst \
  libguestfs-tools genisoimage qemu-utils \
  dnsmasq nftables iproute2 \
  nmap ipcalc net-tools wget curl \
  build-essential python3
```

`virt-customize` comes from `libguestfs-tools`, `arp` from `net-tools`, `networkctl`
from systemd. The startup preflight lists anything missing.

`build-essential` and `python3` are for `node-pty`, which has a native addon and is
compiled by `npm ci`. It backs the atom and worker consoles; without a toolchain the
install fails on whatever host runs `npm ci` — this one for a manual install, the
self-hosted runner under `deploy/README.md`.

Caddy (§ *Caddy (portals)*), ddclient (§ *ddclient (portal DNS)*) and Docker
(§ *Docker (atoms)*) are installed separately: the first is not in the Debian repos and
the other two need their configuration in place before anything starts them.

### System users, directories and permissions

`$USER` below is the account the app will run as. For a service install replace every
occurrence with `cloud-script` — or just follow §3.2, which does exactly that.

```bash
# libvirt access for the user running this app
sudo usermod -aG libvirt,kvm $USER
sudo systemctl enable --now libvirtd.socket systemd-networkd nftables

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

### Worker volumes

Attachable data volumes live in `/var/lib/libvirt/images/volumes`, created on demand by
the app — there is no manual setup step. The directory is deliberately **inside**
`/var/lib/libvirt/images` rather than a sibling of it: on a host where that path is a
dedicated filesystem, a sibling would silently land on the root filesystem instead, and
the `df` preflight in `assertHostDiskAvailable` would be measuring the wrong device.

One volume is one qcow2 file, `vol-<id>.qcow2`, formatted **ext4 on the whole device**
with no partition table and labelled `vol-<id>`. Skipping the partition table keeps
creation to a single `guestfish` call, and the label is what lets the guest's `/etc/fstab`
name the volume without depending on the kernel's device enumeration order.

Attach is cold, and works on the domain definition plus the stopped boot image:

- `virsh attach-device --config` adds the disk at the first free `vdb`…`vdz` slot, which
  is persisted on the row so a retry lands on the same target;
- the mount is written offline into the boot image's `/etc/fstab` with `guestfish`, using
  `LABEL=vol-<id> <mount> ext4 defaults,nofail 0 2`.

`nofail` is not optional: without it, a volume that is missing at boot — detached out of
band, host restored from a partial backup — drops the guest into emergency mode instead of
booting without its data disk.

`deleteWorker` undefines the domain **without** `--remove-all-storage` and removes the
boot image and cloud-init directory by path instead. The flag would delete every attached
volume along with the worker, which is exactly the data the volume lifecycle exists to
preserve.

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
  /usr/bin/true, \
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
  /usr/bin/caddy, \
  /usr/bin/docker, \
  /usr/bin/ddclient, \
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

Paths are host-specific, and `which` is the wrong way to resolve them: sudo walks its
own `secure_path` (`/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`) and
runs the **first** match in that order, which is why `ip`, `nft` and `sysctl` land under
`/usr/sbin`. A wrong path surfaces at runtime as `command not allowed` in the sudo log,
naming the path that was actually resolved; a missing entry makes the app hang on a
password prompt.

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
  will take them with it. `inet filter` is safer than it looks — the shim's filter rules
  go to `ip filter`, a different table this app never touches — so the exposure there is
  limited to something that writes `inet filter` by name.
- Rules you add by hand to `inet filter` or `ip nat` are persisted by the app, but a
  `SYSTEM_RESET` recreates both tables from `NFTABLES_RESET_SOURCE`. Anything that must
  survive a reset — rate limiting, extra accepts — belongs in that file, not in the live
  ruleset.

fail2ban with `banaction = nftables-multiport` needs no special handling: it creates its
own `inet f2b-table` at a lower hook priority, so its bans are evaluated before this
app's rules and neither side touches the other's tables.

### Docker (atoms)

Atoms are Docker containers, so a host that runs them needs Docker — and needs it
configured **before the daemon starts for the first time**. With its defaults it writes
its own chains into `ip nat` and `inet filter`, the two tables this app rewrites on
every zone or fiber change: Docker's rules get dropped silently, and the app persists
whatever is left into `/etc/nftables.conf` as if it owned it.

```bash
# From the repo clone — /opt/cloud-script/marppa-cloud for a service install
sudo mkdir -p /etc/docker
sudo install -m 644 apps/cloud-scripts/deploy/docker-daemon.json /etc/docker/daemon.json

sudo apt install -y docker.io
```

The preflight refuses to start when Docker is installed and `/etc/docker/daemon.json`
does not set `iptables: false`, `ip6tables: false` and `bridge: "none"`, or when a
`DOCKER*` chain shows up in the live ruleset. If the daemon already ran with its
defaults, those chains are still there and have to be removed by hand before the app
will boot.

Connectivity comes from the mesh, never from Docker: an atom needs a node in an ACTIVE
zone, the container is addressed by that node's IP, and a port reachable from outside
the zone is a fiber (DNAT), not `docker run -p`. `deploy/README.md` § *Docker (Nucleus)*
has the full rationale and the network mapping.

Skip this whole section if the host only runs workers — the preflight ignores Docker
when the binary is absent.

### Caddy (portals)

Portals are reverse-proxy sites, one Caddy config file per portal under
`/etc/caddy/sites/`. The app writes and removes those files and reloads Caddy; it never
edits the main `Caddyfile`, so anything you serve from it by hand keeps working.

Caddy is not in the Debian repos — install it from the official repository, then wire
the include once:

```bash
sudo mkdir -p /etc/caddy/sites

# Append once, so the app's per-portal files get picked up
grep -q 'import sites/\*.caddy' /etc/caddy/Caddyfile \
  || echo 'import sites/*.caddy' | sudo tee -a /etc/caddy/Caddyfile

sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

TLS is Caddy's automatic ACME: certificates are requested and renewed on their own, so
portals carry no certificate paths. The host must be reachable on 80 and 443 from the
internet for the challenge to complete.

Per-transponder `cacheEnabled` has no Caddy equivalent (Caddy has no built-in cache; it
needs a plugin) and is logged as a warning rather than silently dropped.

A route is only emitted for a transponder linked to a node — the node's IP is the
upstream. A transponder without one is skipped with a warning, and a portal whose
transponders are all skipped gets an empty `route` block: the domain resolves and
serves nothing.

### ddclient (portal DNS)

A portal's address is kept pointing at the host's public IP by `ddclient`, invoked
one-shot per portal — never as a daemon. Each portal owns an independent config and
cache file, so one portal's credentials or failures cannot affect another's:

- `/etc/ddclient/portals/<portalId>.conf` — written by the app at mode `600` (it holds
  the portal's API token). Regenerated on every sync; manual edits are overwritten.
- `/var/cache/ddclient/portals/<portalId>.cache` — ddclient's own record of the last
  value it pushed. This is what makes repeated syncs cheap: with an unchanged IP
  ddclient skips the provider call entirely.

The app runs `sudo ddclient -file <conf>`, which updates once and exits. A
`PORTAL_UPDATE` event carrying the property `FORCE_SYNC=true` adds `-force`, which
bypasses the cache and pushes the record even when nothing changed — use it to repair a
record edited out-of-band at the provider.

DNS comes first and the site file second, in that order, on both create and update.
The app has no way to prove a tenant owns the hostname it asked for, but writing an A
record in the zone requires an API token that can write that zone — so a successful
`ensurePortalDnsRecord` is the proof, and nothing lands under `/etc/caddy/sites/` until
it passes. Reversing the two would let anyone drop a site block for a hostname they do
not control, with no credentials at all.

That matters because `Caddyfile` ends in `import sites/*.caddy`, so a single bad file
there breaks the **whole** configuration, not just its own portal — Caddy refuses a
duplicate hostname with `ambiguous site definition` and adapts nothing. The running
process keeps its last good config in memory, so the damage stays invisible until
something restarts Caddy and every site goes down at once. `generatePortalConfig`
therefore rolls back: if `caddy validate` rejects the new file it is removed (or the
previous version restored) and Caddy reloaded again, so a rejected portal can never
leave the include directory poisoned.

Two things trigger a sync: the `PORTAL_CREATE`/`PORTAL_UPDATE` processors, and
`IPChecker`, which polls the host's public IP every `IP_CHECK_INTERVAL_MS` and re-syncs
every ACTIVE portal whose stored `lastPublicIP` no longer matches. Without that poller a
portal's record only ever moves when someone edits the portal, so it is what makes the
DNS actually dynamic. The `lastPublicIP` filter is also what keeps the poll cheap: one
IP lookup per cycle instead of one ddclient run per portal.

**Only Cloudflare is supported.** `PortalType` still carries a `DYNU` value in the
database enum, but `SUPPORTED_PORTAL_TYPES` (in `@marppa-cloud/api-types`) is the app's
source of truth: the API rejects any other type on create/update, and the host service
throws rather than writing a config it cannot honour. Widening this means adding the
protocol block to `buildDdclientConfig` and the value to that constant — no migration.

The zone is derived as the last two labels of the address (`api.foo.example.com` →
`example.com`), which is wrong for multi-label public suffixes such as `.co.uk`. Those
domains need the zone stored explicitly on the portal; not supported today.

Install ddclient. **Leave the packaged daemon alone**: if you already keep
`/etc/ddclient.conf` updating records for the host itself, that unit must stay enabled —
the app does not replace it, and disabling it silently stops updating those records.

The two coexist because they share nothing at runtime: the app always passes its own
`-file`, and each generated config pins its own `cache=` under
`/var/cache/ddclient/portals/`, so neither reads nor overwrites the daemon's default
`/var/cache/ddclient/ddclient.cache`.

```bash
sudo apt install ddclient          # 3.10+ — the generated config uses usev4/webv4

sudo mkdir -p /etc/ddclient/portals /var/cache/ddclient/portals
```

The app creates both directories on its first sync anyway (`mkdir -p` through sudo);
creating them up front just makes the layout visible before anything runs.

Verify a portal end-to-end after its first sync:

```bash
sudo ddclient -file /etc/ddclient/portals/<portalId>.conf -force -verbose
```

The generated config deliberately carries **no `daemon` line**, not even `daemon=0`.
Setting it puts ddclient in daemon mode: it forks, the parent exits `0` immediately, and
the update happens in a detached child. The caller sees a clean exit with empty output
whether the record was updated or the credentials were rejected — every failure silently
becomes a healthy portal. Without the line ddclient runs once in the foreground, exits
`1` on failure and prints `FAILED: updating <host>: ...` on stdout, which is what the
processor relies on.

`ddclient -query` is **not** a config check: it probes the legacy `use=` methods rather
than the `usev4`/`webv4` pair the generated file sets, and it has been observed to hang
for minutes. Read the app's own log line instead.

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
| `WS_HOST` | no | Interface the WS server binds to. Default `127.0.0.1` — expose it through Caddy, which terminates TLS so browsers get `wss://`. `0.0.0.0` only if a browser must reach it directly. |
| `WS_ALLOWED_ORIGINS` | yes | Comma-separated browser origins allowed in the WS handshake (e.g. `https://cloud.marppa.com`). The server refuses to boot without it and rejects a handshake carrying no `Origin` at all. |
| `JWT_SECRET` | yes | Must be **identical** to the backend's: WS clients authenticate with the backend's access token. |
| `EVENT_QUEUE_HMAC_SECRET` | yes | Verifies that a BullMQ job was enqueued by the backend. Independent of `JWT_SECRET`, and must match the backend's value. |
| `WORKER_CONSOLE_SECRET_KEY` | yes | 64-char hex (32 bytes), `openssl rand -hex 32`. Encrypts `Worker.consolePassword` at rest (AES-256-GCM). Rotating it makes every stored password undecryptable — those workers lose console access until recreated. |
| `BRIDGE_NAME` | yes | Host **uplink** interface (e.g. `enp3s0`, `br0`) — the one facing your LAN. NAT, fibers (DNAT) and the RFC1918 exceptions hang off it. Not a zone bridge. |
| `USERNAME` | yes | Unix user running the app; used when editing images with guestfish. |
| `MIN_PORT` / `MAX_PORT` | yes | Host port range fibers allocate from (e.g. `30000` / `40000`). |
| `NFTABLES_RESET_SOURCE` | yes | Path to the pristine base ruleset (`/etc/nftables.base.conf` above). Restored by `SYSTEM_RESET`. |
| `ALLOWED_IMAGE_DOMAINS` | yes | Comma-separated allowlist of hosts images may be downloaded from, e.g. `cloud-images.ubuntu.com`. |
| `REQUIRE_EGRESS_HARDENING` | no | `true` fails the preflight unless `NFTABLES_RESET_SOURCE` declares an `output` chain with `policy drop`. See `docs/host-network-hardening.md`. Default `false`. |
| `WORKER_BOOT_TIMEOUT_MS` | no | How long to wait for a VM's first boot before declaring it unreachable. Default `180000`. |
| `IP_CHECK_INTERVAL_MS` | no | How often to re-check the host's public IP and re-sync portal DNS. Default `600000`. |
| `DRIFT_CHECK_INTERVAL_MS` | no | How often the drift reconciler compares the DB against the host's real state. Default `30000`. |
| `LOG_DIR` | no | Log directory. Omit to log only to stdout. |
| `MAX_LOG_SIZE`, `LOG_BACKUP_COUNT` | no | Log rotation. Defaults: 10 MB, 5 files. |
| `USE_STUBS` | no | `true` replaces every host service with a no-op stub **and skips the preflight**. Development only — never set it on the host. |
| `NODE_ENV` | no | Selects the `.env` cascade. |

### Host capacity: measuring and reporting

The host preflight is what tells the platform how big this machine is. After every check
passes (at startup, and again before a system reset) it measures cores, total RAM and the
size of `/var/lib/libvirt/images`, and upserts a `HostCapacity` row keyed by hostname. The
backend reads those rows as its budget — it cannot measure this host itself. A host that
fails the preflight never publishes capacity, and `USE_STUBS=true` skips it entirely, in
which case the backend falls back to its `HIVE_HOST_*` env values.

### Host capacity preflight

`LinuxHiveService` refuses to provision or boot a VM the host cannot actually hold, and
fails the event with the real numbers instead of letting libvirt or the guest die halfway:

- `WORKER_CREATE` reads `df` on `/var/lib/libvirt/images` before copying the base image
  and needs the boot disk to fit in what is free.
- `WORKER_START` reads the domain's configured memory (`virsh dominfo`) and `free -m`'s
  available column, and needs that memory to fit in what is available.

Nothing is held back for the host: both checks pass as long as the resource physically
fits. `free`'s available column and `df`'s avail already exclude what the host itself is
using, so this is not a case of guests eating into host memory — but a start that fits by
a handful of MB leaves no slack, and the OOM killer is what resolves it.

The backend runs its own accounting check (see its README, "Hive catalog") so the API can
answer immediately; these two are the ones that look at the machine's real state, which
also covers whatever is running outside the platform.

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
openssl rand -hex 32                                       # WORKER_CONSOLE_SECRET_KEY
sudo -u cloud-script nano apps/cloud-scripts/.env.local    # fill it per §2
```

Set `USERNAME=cloud-script` in that file: it is the account `guestfish` edits images as,
and it has to match the user the process runs under.

Three values are not free choices — the backend already fixed them, and a mismatch is
silent rather than loud:

- `JWT_SECRET` — copy the backend's, or every WS handshake is rejected;
- `EVENT_QUEUE_HMAC_SECRET` — copy the backend's, or every job is discarded as
  unauthentic and resources sit in `QUEUED` forever;
- `DATABASE_URL` / `REDIS_URL` — the same database and the same Redis instance.

`WORKER_CONSOLE_SECRET_KEY` is this host's own: generate it once with the `openssl` line
above and keep it. Rotating it makes every `Worker.consolePassword` already in the DB
undecryptable — those workers keep running but lose console access until recreated.

`WS_ALLOWED_ORIGINS` must list the frontend's origin (scheme included, no trailing
slash). It has no default: the WS server refuses to boot without it rather than accept a
handshake from any site.

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
  same `JWT_SECRET` and `EVENT_QUEUE_HMAC_SECRET`.
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

Deleting a worker or an atom tears its node down in cascade: fibers are removed from
the host and dropped, and every transponder routed to that node is deleted and its
portal's Caddy config regenerated. A portal left with zero live transponders is deleted
too — its Caddy site and ddclient entry go away, and its address is released
(`deletedAt` is stamped, freeing the `[address, deletedAt]` unique). That last step is
irreversible and loses the portal's `apiKey`; portals shared with nodes that survive the
teardown keep their remaining routes and are only regenerated. Deleting a worker used to
abort when any transponder still pointed at its node, which left the worker stuck in
`QUEUED` with no way forward.

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

**`libvirt is unreachable at qemu:///system`.** The preflight probes libvirt with
`sudo virsh -c qemu:///system version`, not with `systemctl is-active libvirtd`. On
Debian `libvirtd` is socket-activated: it is started on demand by `libvirtd.socket` and
exits again after a couple of idle minutes, so `is-active` reports `inactive (dead)` on
a perfectly healthy host and the service would crashloop every time libvirt went idle.
The probe both tests what the app actually needs — a working connection — and wakes the
daemon through its socket. Enable `libvirtd.socket`, not `libvirtd.service`.

**Everything stays `QUEUED` and nothing happens.** The backend and cloud-scripts are on
different Redis instances, or cloud-scripts is not running. Check
`redis-cli -u $REDIS_URL llen bull:infrastructure-events:wait`.

If the queue drains but the resources never move, the two sides have different
`EVENT_QUEUE_HMAC_SECRET` values: the worker drops every job as unauthentic and logs
`has an invalid or missing signature. Dropping.` Nothing else reports it — the event row
stays untouched, so the resource waits forever.

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

`STATUS_KIND` in the same file classifies each status as `stable`, `transition` or
`terminal`, independent of which event produced it. `transition` means a processor is
expected to move the resource out of it, so a resource sitting there with no live event
is stuck and gets swept by `DriftReconciler`. The classification is declared, not derived
from `EVENT_STATE_MACHINE`: `entry` is not a synonym for transitory, since
`NODE_UNASSIGN_WORKER` enters from `ACTIVE`. Declaring it as a `Record` over the enum
also means adding a status fails the build until it is classified.

`DriftReconciler` sweeps resources left in a `transition` status: it marks them `FAILED`
and broadcasts `reason: 'STUCK_RELEASED'`. A resource is only swept once every **command** event
referencing it has a `processedAt` or `failedAt` — a live event always wins, so the sweep
never races a processor. "Command" is the set of `EVENT_STATE_MACHINE` keys, and that
filter is load-bearing: informational events (`WORKER_DELETED`, `*_FAILED`, …) are created
by processors, carry the resource, and are never dispatched, so their `processedAt` and
`failedAt` stay null forever. Counting those as live would exclude every resource that has
any history and turn the sweep into a no-op. It also waits out `STUCK_GRACE_MS` (10 min). A resource whose
event is still pending forever (the process died mid-work) is not swept: BullMQ
redelivers that job, so it belongs to the queue, not here. `deleteWorker`/`deleteAtom`
accept `FAILED` as well as `INACTIVE`, which is what makes the swept resource actionable
— without that the sweep would only relabel the deadlock.

Host-side removals follow one contract: **absent is success, but never silent.** Every
teardown step records into a `TeardownReport` (`removed` / `absent` / `kept`), which the
delete processors ship both over WebSocket, as `teardown` in the `DELETED` payload, and
into `Event.notes` of the `*_DELETED` event. Idempotency without that report would hide
drift instead of surfacing it.

An `AbortError` is terminal — `EventWorker` marks the event failed and never retries it.
The processor that raises one drives its resource to `fail` first, but only when the
resource was loaded and still sat in `entry`: an abort raised because the resource was
missing, or because it was already in flight under another event, must not overwrite the
status that other event owns.

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
