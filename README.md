# Marppa Cloud Solution

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.md)

This repository contains the code for the Marppa Cloud Solution, which is designed to provide a scalable and efficient cloud-based platform for managing and deploying applications. It contains the fullstack code and server scripts necessary to run the Marppa Cloud Solution.

## Local Development

The monorepo has three runnable apps under `apps/`:

| App | Path | Dev command | Default port |
| --- | --- | --- | --- |
| Back (NestJS API) | `apps/back` | `npm run start:dev` | `4000` |
| Front (Next.js) | `apps/front` | `npm run dev` | `3000` |
| Cloud Scripts (worker + WS server) | `apps/cloud-scripts` | `npm run dev:watch` | WS on `WS_PORT` |

### Do I need TLS / mkcert / JWT keys?

**No.** Two things people expect to need but don't for local dev:

- **JWT** uses HS256, a symmetric algorithm — there are no key files to generate. You only need a shared secret string. Set the **same** `JWT_SECRET` in `apps/back` and `apps/cloud-scripts`; if they differ, the WebSocket handshake (back signs the access token, cloud-scripts verifies it) fails.
- **TLS / mkcert is not required.** In development the auth cookies are `SameSite=Lax` and **not** `Secure`, and host-only on `localhost`, so everything works over plain `http`. The front serves on `http://localhost:3000`, proxies `/api/*` to the back same-origin, and connects to the WS server over `ws://` (not `wss://`). HTTPS is only needed in production.

### Prerequisites

- Node.js (version per `.nvmrc`/`package.json`) and npm workspaces.
- PostgreSQL and Redis. Quick start with Docker:

```bash
docker run -d --name mcs-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=mcs-dev -p 5432:5432 postgres:16
docker run -d --name mcs-redis -p 6379:6379 redis:7
```

Cloud Scripts normally drives libvirt/nftables on a Linux host. For local development on any OS set `USE_STUBS=true` so it uses stub implementations instead of touching real virtualization.

### 1. Install and build shared packages

```bash
npm install
npm run build:shared
```

### 2. Environment files

Each app loads `.env.development.local` (then `.env.local`, `.env.development`, `.env`). Copy each `.env.template` to `.env.development.local` and fill in the values below.

`apps/back/.env.development.local`:

```
PORT=4000
CORS_URL="http://localhost:3000"
COOKIES_DOMAIN=".cloud.marppa.com"
JWT_SECRET="dev-secret-change-me"
REGISTRATION_ENABLED="true"
DATABASE_URL="postgres://postgres:postgres@localhost:5432/mcs-dev?schema=public"
REDIS_URL="redis://localhost:6379"
FRONTEND_URL="http://localhost:3000"
```

`apps/front/.env.development.local`:

```
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_WS_URL="ws://localhost:8080"
```

`apps/cloud-scripts/.env.development.local`:

```
USE_STUBS=true
JWT_SECRET="dev-secret-change-me"
DATABASE_URL="postgres://postgres:postgres@localhost:5432/mcs-dev?schema=public"
REDIS_URL="redis://localhost:6379"
WS_PORT=8080
WS_HOST="127.0.0.1"
MIN_PORT=20000
MAX_PORT=30000
```

Notes:

- `JWT_SECRET` must be identical in back and cloud-scripts.
- `NEXT_PUBLIC_WS_URL` port must match cloud-scripts `WS_PORT`. `WS_HOST=127.0.0.1` still works because the browser connects to `localhost`.
- `REDIS_URL` must be the same instance for back (BullMQ producer) and cloud-scripts (consumer).
- Captcha (`TURNSTILE_*`) and email (`RESEND_*`) are optional in dev: captcha verification is skipped when unset, and password-reset links are logged to the back console instead of being emailed.
- `REGISTRATION_ENABLED=true` lets you create the first user through `POST /auth/register`; leave it `false` (default) in production.

### 3. Database

From `apps/back`:

```bash
npx prisma migrate dev
npm run prisma:seed
```

### 4. Run

In separate terminals:

```bash
cd apps/back && npm run start:dev
cd apps/front && npm run dev
cd apps/cloud-scripts && npm run dev:watch
```

Open `http://localhost:3000`.

### Production topology

The front is deployed to Vercel (`cloud.marppa.com`), the API to Render (`api.cloud.marppa.com`), and the Cloud Scripts WebSocket server behind a reverse proxy (Caddy) at `ws.cloud.marppa.com`. In production `NODE_ENV=production` makes the cookies `Secure` + `SameSite=None` scoped to `COOKIES_DOMAIN`, the front proxies `/api` to `NEXT_PUBLIC_API_URL`, and the WS server binds to loopback (`WS_HOST=127.0.0.1`) with TLS terminated by the proxy so browsers connect over `wss://`.

### Running the front against the production API

`npm run dev:prod-api` (from `apps/front`) serves the dev front with `NEXT_PUBLIC_*` pointed at `api.cloud.marppa.com` / `ws.cloud.marppa.com`, over HTTPS on `https://local.cloud.marppa.com:3000`. Process env wins over `.env.development.local`, so your normal local-dev file stays untouched.

It cannot be served from `http://localhost:3000`, and that is not a config detail worth working around: in production the API sets its auth cookies `Secure; SameSite=None; Domain=.cloud.marppa.com`. A browser rejects a `Domain=.cloud.marppa.com` cookie on a response from `localhost`, so login appears to succeed and every following request is anonymous. Serving the dev front from a host *inside* that cookie domain, over TLS, is what makes the session stick — the `/api` rewrite proxies to the production API server-side, so there is no CORS involved and `credentials: same-origin` is enough.

Prerequisites, once per machine:

1. Point the hostname at your loopback — add to `C:\Windows\System32\drivers\etc\hosts` (as administrator) or `/etc/hosts`:

   ```
   127.0.0.1 local.cloud.marppa.com
   ```

2. Trust a local CA and issue the certificate the script expects, from `apps/front`:

   ```bash
   mkcert -install
   mkcert -key-file certificates/local-key.pem -cert-file certificates/local.pem local.cloud.marppa.com localhost 127.0.0.1 ::1
   ```

   The certificate is generated by hand and passed to Next explicitly because Next's own `--experimental-https` downloads a second mkcert and runs `mkcert -install`, which fails on machines with a JDK whose `cacerts` keystore isn't writable — and then silently falls back to plain HTTP, which breaks the cookie domain this whole setup exists for. `*.pem` is already gitignored.

Known limits of this mode:

- **Live updates are off** unless the host's `WS_ALLOWED_ORIGINS` includes `https://local.cloud.marppa.com:3000`; the WS server rejects unknown origins at the handshake, so resources fall back to whatever the REST calls returned.
- **You are hitting production data.** Every mutation creates, mutates or destroys real VMs, zones and firewall rules on the host.
- Turnstile uses the production site key; it validates because Cloudflare accepts subdomains of the configured domain.

### Hosting Cloud Scripts (networking & security)

Cloud Scripts runs on the hypervisor host — typically a machine on your own LAN (e.g. `192.168.1.100`) behind a home/office router with a **dynamic** public IP kept current in Cloudflare by a DDNS updater. Two very different kinds of traffic reach that host, and they need different DNS records:

- **WebSocket** — browsers connect to `wss://ws.cloud.marppa.com` on port `443`, terminated by Caddy. This can go through Cloudflare's **proxy (orange cloud)**: Cloudflare supports WebSocket over 443, gives you TLS and DDoS protection, and hides your real IP.
- **Fibers** — the connect commands the UI renders (`ssh -p <hostPort> ubuntu@<host>`, or `<host>:<hostPort>`) are **raw TCP** to a port in the `MIN_PORT`–`MAX_PORT` range. Cloudflare's proxy does **not** forward arbitrary TCP ports (only 80/443-class HTTP), so this traffic must reach your real IP directly.

Because one hostname cannot be both proxied and direct, use **two records**:

| Record | Cloudflare mode | Points at | Used for |
| --- | --- | --- | --- |
| `ws.cloud.marppa.com` | Proxied (orange) | Your public IP | `wss://` WebSocket on 443 (via Caddy) |
| `host.cloud.marppa.com` | DNS-only (grey), low TTL (60s) | Your public IP | Fiber connect commands (raw TCP) |

Then set on the front (Vercel):

```
NEXT_PUBLIC_WS_URL=wss://ws.cloud.marppa.com
NEXT_PUBLIC_HOST_ADDRESS=host.cloud.marppa.com
```

The `host.cloud.marppa.com` record must be **DNS-only (grey)** so it resolves to your real IP; a proxied record would send `ssh`/raw-TCP at Cloudflare, which drops it. Keep its TTL low (60s): when your dynamic IP changes there is a window (your DDNS interval plus the TTL) where fiber connections fail. The proxied `ws.` record is unaffected by IP changes because clients hit Cloudflare's edge.

**Router port-forwarding** — forward these from the router to the host (`192.168.1.100`):

- `443/tcp` → Caddy (the WebSocket entrypoint).
- `MIN_PORT`–`MAX_PORT` `/tcp` → the host (the fiber DNAT range).

**Host firewall** — allow only `443/tcp` and the `MIN_PORT`–`MAX_PORT` range from the internet; default-deny everything else. The WS server itself stays bound to loopback (`WS_HOST=127.0.0.1`) and is never exposed directly — only Caddy on the same host reaches it. Keep `WS_ALLOWED_ORIGINS=https://cloud.marppa.com`.

**Security recommendations** — fibers deliberately expose worker ports (including SSH) to the internet from your network, so harden accordingly:

- Run **fail2ban** on the host to ban brute-force sources hitting SSH and other exposed ports.
- SSH: key-only authentication, `PasswordAuthentication no`, `PermitRootLogin no`. Workers should ship with an authorized key rather than a password.
- Keep the exposed port range as narrow as your fiber needs require, and default-deny at both the router and the host firewall.
- Keep the host patched; monitor auth logs and set alerts on repeated failures.
- If you would rather not expose raw ports from a home network at all, consider a VPN/bastion in front of the fibers, or Cloudflare Spectrum (paid) to proxy arbitrary TCP through Cloudflare instead of the grey record.

**Network segmentation (VLAN/DMZ)** — a full security audit (2026-07-28) covered application-level hardening (IDOR/ownership guards, RBAC, CSRF, rate limiting, JWT/queue signing, audit trail, a centralized CASL authorization layer, etc.), all resolved. The one item deliberately left open is putting the Cloud Scripts host behind a segmented VLAN/DMZ: that needs a router/switch capable of VLAN tagging and isolated zones, which a typical consumer ISP router doesn't support. It's infrastructure, not code, so it's tracked here instead of a checklist in the repo — revisit once the host moves to hardware/hosting that supports it.

Broad strokes for when that hardware is in place:

1. **Hardware.** Replace the ISP router with something that does 802.1Q VLAN tagging and inter-VLAN firewall rules — a pfSense/OPNsense box, or a prosumer router (e.g. UniFi/MikroTik) paired with a managed switch. The ISP router still terminates the WAN, but hands routing/firewalling to this device (bridge mode).
2. **Carve out the zones.** At minimum three VLANs: a **DMZ** for the Cloud Scripts host (the only thing exposed to the internet), a **management** VLAN for admin access (SSH/UniFi controller/etc., never internet-facing), and the regular **trusted LAN** for everyday devices. Each is its own subnet/broadcast domain.
3. **Firewall rules between zones, default-deny.** DMZ → LAN: blocked entirely — a compromised Cloud Scripts host must not be able to pivot to the rest of the home network. LAN → DMZ: blocked except what's explicitly needed (e.g. admin SSH from the management VLAN only). Internet → DMZ: only `443/tcp` (Caddy/WS) and the `MIN_PORT`–`MAX_PORT` fiber range, exactly as today's host firewall already restricts, just enforced one layer earlier at the router.
4. **Physical/logical placement.** Either a dedicated switch port trunked with the DMZ VLAN tag for the host's NIC, or (simpler, same effect) a separate physical switch for the DMZ segment if the hardware doesn't support tagging cleanly.
5. **Re-verify egress, not just ingress.** The DMZ should also restrict outbound traffic from the host to what it actually needs (DNS, NTP, the Postgres/Redis instances if they move elsewhere, package repos) — a segmentation project that only blocks inbound but leaves egress wide open still lets a compromised host phone home or scan the LAN.
6. **Test the isolation before trusting it**: from a device on the trusted LAN, confirm the DMZ host is unreachable on any port other than the ones explicitly allowed; from the DMZ host, confirm it cannot reach LAN devices at all.

None of this touches application code — it's purely router/switch configuration once the hardware supports it.

**In the meantime — host-only substitute.** Full VLAN/DMZ isolation is a Layer 2 property (a firewall on the host alone can't stop another LAN device from reaching it at the wire level), but a host-side egress/ingress allowlist still meaningfully bounds what a compromised host could do: no scanning the LAN, no exfiltrating to arbitrary destinations, no reachability from the LAN beyond an explicit admin IP. Applied via `nftables`, opt-in and fail-closed at boot (`REQUIRE_EGRESS_HARDENING=true` in `apps/cloud-scripts`) — see `docs/host-network-hardening.md` for the concrete ruleset and the reasoning.

## Hive

The Hive is a core module of the MCS that provides virtualization for running applications. It is designed to be lightweight and efficient, allowing for quick deployment and management of VMs. Within the Hive, users can create, manage, and scale Workers (VMs) as needed, providing a flexible environment for application development and deployment.

### Workers

Workers are the virtual machines that run within the Hive. They can be created, managed, and scaled according to the needs of the applications being deployed. The Hive provides a user-friendly interface for managing these Workers, allowing users to easily monitor their performance and make adjustments as necessary.

The host machine creates Workers by running the `create_worker.sh` script, which sets up the necessary environment and configurations for each Worker. This script is designed to be run on the host machine, and it will create a new Worker VM with the specified parameters.

## Nibble

Nibble is a lightweight, efficient, and secure containerization solution designed to run applications within the Marppa Cloud Solution. It provides a streamlined environment for deploying and managing docker applications.

### Bits

Bits are the individual containers that run within Nibble. Each Bit is a self-contained unit that can run a specific application or service. Bits are designed to be lightweight and efficient, allowing for quick deployment and scaling of applications.

Bits can be easily managed and monitored through the Nibble interface, providing users with the tools they need to ensure their applications are running smoothly.

## Mesh

The Mesh is another core module of the MCS that provides a network layer for communication between Workers and other components of the system. It ensures that all Workers can communicate with each other and with the Hive, enabling seamless operation of applications across the cloud platform.

### Zones

Zones are logical groupings of Workers within the Mesh. They allow for better organization and management of Workers, enabling users to group them based on specific criteria such as geographical location, application type, or resource requirements. Each Zone can have its own set of configurations and policies, allowing for tailored management of the Workers within that Zone.

Zones help in optimizing resource allocation and improving the performance of applications by ensuring that Workers are grouped in a way that minimizes latency and maximizes efficiency.

### Nodes

Nodes are the IP addresses within a Zone that are used to identify and communicate with Workers. Each Worker is assigned a unique Node IP address, which allows it to be accessed and managed within the Mesh. The Nodes are essential for ensuring that all Workers can communicate effectively, enabling the distributed nature of the Marppa Cloud Solution.

Each Node is meant to be secure and isolated, ensuring that communication between Workers is efficient and reliable. The Mesh provides the necessary infrastructure to manage these Nodes, allowing for easy scaling and management of the cloud environment.

A Node belongs to the Worker or Atom it points at, so deleting a stopped Worker/Atom deletes it in cascade: `WORKER_DELETE`/`ATOM_DELETE` tear the Node down inside their own processor instead of relying on a chain of queued events, which is what guarantees the host side (nftables DNAT rules of every Fiber, the dnsmasq reservation of the Node) is undone before the VM or container disappears. Assigning and unassigning a Node is still available on its own from the Worker/Atom dialog, and the Zone module keeps managing the Nodes already in it.

Transponders are the exception: they belong to a Portal, not to the Worker/Atom, so a Node still routed by one blocks the delete instead of being cascaded — remove the transponder from its Portal first.

### Fibers

Fibers are the relationships between Nodes, Workers and Bits within the Mesh. They enable communication and data transfer between different components of the system, ensuring that all parts of the Marppa Cloud Solution can work together seamlessly.