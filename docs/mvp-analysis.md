# MVP Analysis and Roadmap — Marppa Cloud Solution

> Architectural analysis, release plan and product vision document.
> Analysis author: Software Architect / Principal Product Engineer (static repo review).
> Analysis date: 2026-07-14 · **Iteration 2** (roadmap refinement): 2026-07-14.
> **This document does not modify code.** It is analysis and planning only.

---

## How to read this document

- **Sections 1–7** (Summary → Missing functionality): analysis of the current state. Assumed correct and not re-verified in this iteration.
- **Section 8 — Release Plan:** the backlog reorganized into **four releases** (0.1 MVP → 0.2 UX → 0.3 Features → 1.0 Hardening). **It is the roadmap's source of truth.**
- **Section 9 — Epic: Operations UX:** the new epic that turns operations observability into the product's differentiator.
- **Section 10 — Risks.**
- **Section 11 — Product Vision:** how using the platform should *feel*. A guide for every UX decision.

> **Iteration 2 note:** the previous backlog mixed "build an MVP" with "prepare an enterprise product." This version separates them. The product's north star is: **fully observable infrastructure — every operation feels like a Job with a timeline, progress, clear errors and recovery.**

---

# 1. Executive summary

Marppa Cloud Solution (MCS) is an IaaS-style infrastructure platform, early-stage but **surprisingly mature at its technical core**. It's not a skeleton: it contains real virtual machine provisioning over **libvirt/KVM** (`virt-install`, `cloud-init`, `qemu-img`), real virtual networking over **Linux bridges + dnsmasq (DHCP) + nftables (NAT/port-forwarding)**, a robust asynchronous event system over **BullMQ/Redis** with retries and WebSocket notification, and a Next.js front end with working dashboards.

The architecture is solid (hexagonal / clean architecture per module, back ↔ orchestrator ↔ front separation via an event queue). The project is **more advanced than the commits suggest**.

The MVP today **is not functional end-to-end** because of three concrete blockers:

1. **The star flow (connecting a Worker ↔ Mesh via Node) is broken in orchestration:** creating a Node writes to the database with `ACTIVE` status but **triggers no event**, so the DHCP reservation and wiring the NIC to the bridge (implemented in `cloud-scripts`) never run. The Node ends up as a ghost record. There's also no UI to create/assign Nodes.
2. **Inconsistency in Worker creation:** the back creates the Worker in `PROVISIONING`, but `WorkerCreateProcessor` aborts if the status isn't `QUEUED`. Statically, provisioning appears to always fail (verify at runtime).
3. **Inconsistent base image:** the seed image points to an Ubuntu server ISO instead of a qcow2 cloud image; without fixing this, not even one VM boots.

There's also a **conceptual mismatch**: **there's no "Mesh" entity**. "Mesh" is just the module's name; the real network entity is **`Zone`**, which represents **a single subnet** (`cidr` + `gateway`). The "Mesh that contains multiple subnets/rules" **isn't modeled** — it's a pending product decision.

**The rest of the system (security, RBAC, advanced observability, multi-host) is NOT needed for a demoable MVP** and is deferred to the Hardening release.

**Verdict:** excellent technical foundation. The path to the MVP isn't building foundations, it's **closing the Node flow, stabilizing Worker creation, and making every operation observable**. With focus, the MVP is reachable within a few iterations.

---

# 2. Current project state

## Monorepo (npm workspaces)

```
apps/
  back/           NestJS — REST API + domain + event dispatch
  cloud-scripts/  Orchestrator — consumes events (BullMQ) and runs real Linux commands
  front/          Next.js (App Router) — dashboards
packages/
  db/             Prisma schema + migrations (PostgreSQL)
  api-types/      Shared types back ↔ front
  shared/         Shared utilities
```

## Maturity per app

| App | Maturity | Notes |
|-----|---------|---------------|
| `back` | **High** | Complete hexagonal architecture per module. Unit tests present. |
| `cloud-scripts` | **High (technical)** | Own DI, per-event processors, real `Linux*` implementations + `Stub*` for development. Real VM and network provisioning. |
| `front` | **Medium** | Dashboards, forms, tables, WebSocket, client-side SSH key generation. Missing key screens (Node assignment, Fibers). |
| `packages/db` | **High** | Rich, coherent data model; 3 migrations applied. |

## "Work in progress" signals
- `front/middleware.ts` is a **no-op** (doesn't protect routes).
- Schema entities with no backend module (`Atom` → "Nucleus"/"Nibble", not implemented).
- Authentication guard applied **inconsistently** (only auth/company/user).

---

# 3. Architecture found

## General pattern: event-driven CQRS-lite

```
┌──────────┐   REST    ┌──────────────┐  writes DB + queues     ┌───────────┐
│  front   │ ────────▶ │     back     │ ──────────────────────▶ │  Redis /  │
│ (Next.js)│           │  (NestJS)    │      (BullMQ)           │  BullMQ   │
└──────────┘           └──────────────┘                         └─────┬─────┘
     ▲                        │                                       │ consumes
     │  WebSocket (status)    │ Prisma                                ▼
     │                        ▼                              ┌──────────────────┐
     └──────────────────────────────────────────────────────│  cloud-scripts   │
                          PostgreSQL  ◀─────────────────────│  (orchestrator)  │
                                         updates status      │  libvirt/nft/... │
                                                             └──────────────────┘
```

**Canonical flow (create Worker):** front `POST /hive/workers` → `WorkerApiService` persists + `EventDispatchService.dispatch(WORKER_CREATE)` → BullMQ → `EventWorker` (cloud-scripts) resolves the processor → `WorkerCreateProcessor` calls `LinuxHiveService` (image, cloud-init, `virt-install`) → updates DB status and **pushes over WebSocket** to the front.

Every back module repeats: `domain / application / infrastructure / presentation`. The orchestrator uses its **own DI** with `@EventProcessor(EventType.X)`. Infrastructure services have dual implementations, `Linux*` (production) / `Stub*` (dev). Unified `ResourceStatus` state machine: `INACTIVE, QUEUED, PROVISIONING, UPDATING, ACTIVE, FAILED, TERMINATING, TERMINATED, DELETING, DELETED`.

**Key MVP relationship:** `Node` = (unique `ipAddress`) + FK to `Zone` + optional unique FK to `Worker`. It's the "Node" concept from the brief (connects a VM to a network). `Fiber` = a port-forwarding rule on a Node.

---

# 4. Comparison with Cockpit (capabilities)

| Capability (Cockpit reference) | MCS status | Comment |
|---|---|---|
| Virtualization — create VM | **Exists** | Real `virt-install` + cloud-init (with the status bug to fix). |
| Lifecycle (start/stop/delete) | **Exists** | Events + `virsh`. |
| Edit resources (CPU/RAM/disk) | **Partial** | Execution exists in `LinuxHiveService`; the update flow only changes the name. No UI. |
| Console / access | **Partial** | Serial console reading (diagnostics) exists; no web console. SSH access. |
| Networking — bridges / interfaces | **Exists** | Bridge per Zone. |
| Networking — DHCP / IP ranges | **Exists** | dnsmasq with range and MAC-based reservations. |
| Networking — firewall / NAT / port-forward | **Exists** | nftables (masquerade + DNAT via Fibers). No UI. |
| Networking — assign VM to network | **Partial / broken** | Model and execution exist; **the flow doesn't trigger the event** and there's no UI. |
| Physical host management | **Missing** | The host is implicit. |
| Storage (volumes) | **Partial (out of MVP scope)** | Modeled; no CRUD/attach. |
| Resource states | **Exists** | `ResourceStatus` + WebSocket. **Strength.** |
| Live monitoring (CPU/RAM/network) | **Missing** | No metrics. |
| Logs / journal for the user | **Missing** | `Event` history exists. |
| Web terminal / host updates / containers | **Not applicable to MVP** | — |
| Accounts / sessions | **Partial** | JWT + `Session`; no user/role management in the UI. |

**Reading:** MCS already covers virtualization and networking at Cockpit's level, with the advantage of being multi-tenant and asynchronous. What the MVP needs and is missing: closing the VM↔network flow and making each operation's status visible.

---

# 5. Existing functionality

Legend: ✅ complete · 🟡 partial · 🔴 broken/nonexistent

**Auth/multi-tenancy:** ✅ JWT login + `Session` + Argon2 · ✅ per-request context (ALS) · 🟡 `LoggedInGuard` only on auth/company/user · 🟡 multi-tenant model with no tenant filtering · 🔴 no RBAC · 🔴 `front/middleware.ts` no-op.

**Hive/Workers:** 🟡 create (status bug) · ✅ list/detail · ✅ start/stop/delete · 🟡 update (name only) · ✅ Families/Flavors/Images catalog · 🟡 disks modeled with no CRUD.

**Mesh/Zones:** ✅ create/list/detail/update/delete Zone · ✅ validate Zone · 🔴 **create/assign Node doesn't trigger an event** · 🔴 no Node UI · 🟡 Fibers complete in the back, **no UI**.

**Orbit (Portals/Transponders):** ✅ CRUD + events + execution + UI. ℹ️ **Out of MVP scope.**

**Event system:** ✅ dispatch, BullMQ, retries, backoff, deferred by parent status, failure variants, `Event` history, WebSocket. **Strong point.**

**Front end:** ✅ own design system, async tables, dialogs, forms, WebSocket provider · ✅ hive/mesh/orbit and login dashboards · ✅ client-side SSH key generation.

---

# 6. Missing functionality (summary)

Detailed and prioritized in the Release Plan (§8). In order of impact: (1) fix the Node flow, (2) Worker↔Zone assignment UI, (3) stabilize Worker creation, (4) valid base image, (5) "Mesh" definition, (6) **operations observability (new differentiator)**, (7) UI error feedback, (8) Fibers UI, (9) security/RBAC, (10) validations, (11) monitoring, (12) operational observability.

---

# 7. Roadmap framework

## 7.1 Priority scale (strict)

| Priority | Meaning | Rule |
|-----------|-------------|-------|
| **P0** | Without this the MVP **literally doesn't work**. | Only blockers on the happy path of: create Mesh → create Worker → connect via Node → see it happen. |
| **P1** | **Massively improves** the product (perceived quality or real risk). | Doesn't block the demo, but without this the product feels incomplete or insecure. |
| **P2** | **Very nice to have.** | Polish, convenience, additional capabilities. |
| **P3** | **Future roadmap.** | Outside the 1.0 horizon. |

> There are deliberately **few P0s**. If everything were P0, nothing would be.

## 7.2 The four releases

| Release | Name | Goal | "Done" criteria |
|---------|--------|----------|---------------------|
| **0.1** | **MVP** | A user creates a network, creates a VM, connects it, manages it, and **understands what's happening** at each operation. | Functional end-to-end demo of the happy path. |
| **0.2** | **UX** | Using the platform is a **pleasure**: job timeline, progress, clear errors, retry, dashboards, network info. | Operations observability is excellent. |
| **0.3** | **Features** | **More capabilities**: Fibers, resource editing, monitoring, storage. | The product does more things. |
| **1.0** | **Hardening** | What an end user doesn't need to *try* it: security, RBAC, audit, state machine, idempotency, log correlation, scalability, multi-host. | Production-ready. |

**Golden rule:** no 0.1 item depends on an item from a later release.

---

# 8. Release Plan (backlog)

> Each item keeps its **origin ID** (for traceability with iteration 1). Items marked `▸ split` were split for exceeding ~1–2 days of work. `OUX-*` items belong to the Operations UX Epic (§9). Per-item fields: description · goal · acceptance criteria · priority · dependencies.

---

## 🟢 Release 0.1 — MVP

**Goal:** a complete, observable happy path. A logged-in user can: create a network (Mesh/Zone), create a Worker, connect it to the network via Node, manage them, and **see each operation's status as it happens**.

### Content and priorities

| ID | Title | Priority |
|----|--------|-----------|
| 3.1 | Worker initial state compatible with the processor | **P0** |
| 6.3 | Valid cloud base image | **P0** |
| 2.1a | Creating a Node dispatches `NODE_ASSIGN_WORKER` | **P0** |
| 2.1b | Node status transitions and failure event | **P0** |
| 2.3a | UI: select and assign a Worker to a Zone | **P0** |
| 4.1 | Product decision: what is a "Mesh" | **P0** |
| OUX-1 | Every action creates an observable "Operation" | **P0** |
| 2.3b | UI: assigned IP and live assignment status | **P1** |
| 2.2 | Unassigning a Node dispatches `NODE_UNASSIGN_WORKER` | **P1** |
| 2.4 | UI: manage/unassign Node | **P1** |
| 2.5 | Assignment validations (worker already assigned, IP in range) | **P1** |
| 4.2 | Align Mesh/Zone vocabulary in UI and API | **P1** |
| OUX-2 | Intermediate-state vocabulary per resource | **P1** |
| OUX-4 | Clear, unambiguous failure indication | **P1** |

### Detail

**3.1 — Worker initial state compatible with the processor · P0**
- Description: creation builds the Worker in `PROVISIONING`; the processor aborts if it isn't `QUEUED`.
- Goal: Worker creation completes provisioning end-to-end.
- Criteria: creation leaves the Worker in `QUEUED`; the processor transitions `PROVISIONING → INACTIVE` and defines the VM; integration test of the flow with `StubHiveService`.
- Dependencies: none.

**6.3 — Valid cloud base image · P0**
- Description: the seed image uses an Ubuntu server ISO, not a qcow2 cloud image compatible with `virt-install --import`.
- Goal: an image catalog consistent with cloud-init.
- Criteria: the default image is a valid qcow2 cloud image; the creation flow boots the VM.
- Dependencies: 3.1.

**2.1a — Creating a Node dispatches `NODE_ASSIGN_WORKER` · P0** `▸ split from 2.1`
- Description: `NodeApiService.create` persists the Node without dispatching an event; the host-side execution never happens.
- Goal: creating a Node queues network provisioning.
- Criteria: creation persists in `QUEUED` and dispatches `NODE_ASSIGN_WORKER`; the job is consumed; `dhcp-host=<mac>,<ip>` ends up in the bridge's `.conf` and the Worker's NIC shows up attached (`virsh domiflist`).
- Dependencies: none.

**2.1b — Node status transitions and failure event · P0** `▸ split from 2.1`
- Description: reflect the assignment's lifecycle.
- Goal: the Node transitions consistently and communicates failures.
- Criteria: `QUEUED → PROVISIONING → ACTIVE` reflected over WebSocket; on failure → `FAILED` + `NODE_ASSIGN_WORKER_FAILED`.
- Dependencies: 2.1a.

**2.3a — UI: select and assign a Worker to a Zone · P0** `▸ split from 2.3`
- Description: there's no form to create/assign a Node.
- Goal: assign an available Worker from the Zone detail view.
- Criteria: an "Assign Worker" button opens a picker of unassigned Workers; confirming calls Node creation; the list updates.
- Dependencies: 2.1a.

**2.3b — UI: assigned IP and live assignment status · P1** `▸ split from 2.3`
- Description: feedback for the assignment operation.
- Goal: see the `QUEUED→ACTIVE` progress and the resulting IP.
- Criteria: the assignment shows live status (via WebSocket) and the assigned IP; a visible error if it fails.
- Dependencies: 2.3a, 2.1b, OUX-1.

**4.1 — Product decision: what is a "Mesh" · P0**
- Description: there's no Mesh entity; `Zone` is a single subnet.
- Goal: fix the MVP's network model and vocabulary.
- Criteria: decision document with the chosen option — (A) **Zone == Mesh** (one subnet per network; naming alignment only) or (B) Mesh as a subnet grouping (new entity; deferred post-MVP). **MVP recommendation: option A.**
- Dependencies: none.

**OUX-1 — Every action creates an observable "Operation" · P0** *(see §9)*
- Description: every create/start/stop/delete/assign exposes an "Operation" with a queryable current status from the resource.
- Goal: fulfill the MVP requirement "the user understands what's happening".
- Criteria: each resource's detail shows its in-progress operation with a current status that updates without refreshing; on finishing, shows Completed or Failed.
- Dependencies: none (leverages existing events + WebSocket).

**2.2 — Unassigning a Node dispatches `NODE_UNASSIGN_WORKER` · P1**
- Criteria: deleting a Node rolls back the DHCP reservation and disconnects the NIC; consistent status.
- Dependencies: 2.1a.

**2.4 — UI: manage/unassign Node · P1**
- Criteria: "Unassign" action with confirmation; reflects status; updates the list.
- Dependencies: 2.2, 2.3a.

**2.5 — Assignment validations · P1**
- Criteria: prevent assigning an already-assigned Worker or an IP outside the range; clear `409/400` errors; covered by tests.
- Dependencies: 2.1a.

**4.2 — Align Mesh/Zone vocabulary in UI and API · P1**
- Description: apply decision 4.1 (option A) to visible naming.
- Criteria: the UI and routes use vocabulary consistent with the product (Mesh/Worker/Node); no model changes if it's option A.
- Dependencies: 4.1.

**OUX-2 — Intermediate-state vocabulary per resource · P1** *(see §9)*
**OUX-4 — Clear, unambiguous failure indication · P1** *(see §9)*

---

## 🔵 Release 0.2 — UX

**Goal:** make operations observability **excellent**. Most of the Operations UX Epic lives here: timeline, progress, retry/abort, history, friendly logs, dashboards and network info. None of this adds new infrastructure capabilities; it makes the existing ones a pleasure to use.

### Content and priorities

| ID | Title | Priority |
|----|--------|-----------|
| OUX-5 | Visual operation timeline (steps) | **P1** |
| OUX-7 | Actionable errors (what step, why) | **P1** |
| OUX-8 | Retry button | **P1** |
| OUX-15 | Consistent visual status system | **P1** |
| 3.3 | Error status feedback in the Workers UI | **P1** |
| OUX-3 | Global live status without refreshing | **P1** |
| OUX-6 | Progress bar / percentage | **P2** |
| OUX-9 | Abort / Cancel button | **P2** |
| OUX-10 | Per-resource operation history | **P2** |
| OUX-11 | Global activity feed | **P2** |
| OUX-12 | Per-step and total duration | **P2** |
| OUX-13 | Resources affected by the operation | **P2** |
| OUX-14 | Friendly logs (human language) | **P2** |
| OUX-16 | Empty states, skeletons and destructive confirmations | **P2** |
| OUX-17 | End-of-operation notifications | **P2** |
| 4.4 | Visualize IP ranges and Zone occupancy | **P2** |
| 1.3 | Redirect to login when there's no session (front) | **P2** |
| 6.2 | Onboarding: reproducible seed and first user/company | **P2** |

> The detail of every `OUX-*` story is in **§9 Epic: Operations UX**.

### Non-OUX item detail

**3.3 — Error status feedback in the Workers UI · P1**
- Description: the back produces `FAILED`, reasons and retries; the UI doesn't show them consistently. Builds on OUX-4/OUX-7.
- Criteria: `FAILED` visible with the last failure event's reason; access to retry if applicable.
- Dependencies: OUX-4, OUX-7.

**4.4 — Visualize IP ranges and Zone occupancy · P2**
- Criteria: the Zone detail shows CIDR, gateway, DHCP range and IPs taken by Nodes.
- Dependencies: 4.2.

**1.3 — Redirect to login when there's no session (front) · P2**
- Description: `middleware.ts` is a no-op; a UX improvement (not hard security).
- Criteria: `/dashboard/**` without a session redirects to `/login`.
- Dependencies: none.

**6.2 — Onboarding: reproducible seed and first user/company · P2**
- Criteria: documented idempotent seed; a clear path to the initial user/company.
- Dependencies: none.

---

## 🟣 Release 0.3 — Features

**Goal:** grow the product's **capabilities** once the core is solid and pleasant.

| ID | Title | Priority | Dependencies |
|----|--------|-----------|--------------|
| 4.3 | Fibers UI (port-forwarding) | **P2** | Epic 2, OUX-5 |
| 3.2a | Back: apply Worker resource changes (CPU/RAM/disk) | **P2** | 3.1 |
| 3.2b | UI: resize Worker (change flavor/resources) | **P2** | 3.2a |
| 5.2a | `/health` endpoint (DB, Redis) | **P2** | — |
| 5.2b | Queue status visibility (pending/failed jobs) | **P2** | 5.2a |
| — | Basic Worker monitoring (CPU/RAM usage) | **P2** | 3.1 |
| — | Storage: disk CRUD + attach/detach | **P3** | 3.2a |
| — | Orbit inside the product (Portals/Transponders already built) | **P3** | — |

### Detail

**4.3 — Fibers UI · P2**
- Description: complete back (events + nftables), no UI.
- Criteria: create/edit/delete Fiber from the Node detail view; port conflict validation (`PortConflictError` already exists); live status with timeline (OUX-5).
- Dependencies: Epic 2, OUX-5.

**3.2a — Back: apply Worker resource changes · P2** `▸ split from 3.2`
- Description: the execution exists (`editWorkerMemory/Cpus/DiskSpace`) but `WorkerUpdateProcessor` doesn't apply it.
- Criteria: `WORKER_UPDATE` with new resources applies `virsh setmem/setvcpus` / `qemu-img resize`; doesn't allow shrinking the disk.
- Dependencies: 3.1.

**3.2b — UI: resize Worker · P2** `▸ split from 3.2`
- Criteria: the user changes an existing Worker's flavor/resources and sees the operation in the timeline.
- Dependencies: 3.2a, OUX-5.

**5.2a / 5.2b — Health checks and queue visibility · P2** `▸ split from 5.2`
- Criteria: `/health` reports DB and Redis; a panel/endpoint with `QUEUED/FAILED` event counts.
- Dependencies: 5.2a → 5.2b.

**Basic Worker monitoring · P2** *(new, capability)*
- Criteria: the Worker detail view shows CPU/RAM usage (even simple sampling).
- Dependencies: 3.1.

**Storage (disk CRUD + attach/detach) · P3** — future capability.
**Orbit inside the product · P3** — already built; bring it in once the core has matured (needs `apiKey` encryption, §Hardening).

---

## 🔴 Release 1.0 — Hardening

**Goal:** everything an end user **doesn't need to try** the product, but does need to operate it in production securely and at scale.

| ID | Title | Priority | Dependencies |
|----|--------|-----------|--------------|
| 1.1 | Global authentication guard on infrastructure endpoints | **P1** | — |
| 1.2 | Per-tenant scoping on reads (eliminate IDOR) | **P1** | 1.1 |
| 5.1a | DTO validation — mesh/zone/node/fiber | **P1** | — |
| 5.1b | DTO validation — worker | **P1** | — |
| 5.4a | Define a centralized `ResourceStatus` state machine | **P1** | — |
| 1.4a | Role model (owner/admin/member) | **P2** | 1.1 |
| 1.4b | Permission enforcement on destructive operations | **P2** | 1.4a |
| 5.4b | Apply the state machine to Worker | **P2** | 5.4a |
| 5.4c | Apply the state machine to Zone/Node | **P2** | 5.4a |
| 5.3 | Structured logs with per-event correlation | **P2** | — |
| 5.5 | Idempotency and compensation on partial failures | **P2** | 5.4a |
| 6.1 | Host setup documentation | **P2** | — |
| — | Encrypt secrets at rest (`apiKey`, credentials) | **P2** | — |
| — | Rate limiting on auth and resource creation | **P2** | 1.1 |
| — | Queue high availability + observable dead-letter | **P3** | 5.2b |
| — | Multi-host / scheduling (beyond single point of failure) | **P3** | — |
| — | Audit (who did what, when) | **P3** | 1.4a, 5.3 |

> **Security note (important):** 1.1 and 1.2 live in Hardening by product decision (the MVP is demoed in a controlled environment). **If the demo is exposed publicly, bring 1.1 forward (global guard) to 0.1 — it's cheap and prevents unauthenticated access to the infrastructure.** Not a functional blocker, but an exposure one.

### Detail (summary; criteria inherited from iteration 1)

- **1.1 · P1** — global `LoggedInGuard` (`APP_GUARD`) with an opt-out for login; `401` with no token on hive/mesh/orbit; tests.
- **1.2 · P1** — every access filters by `companyId`; cross-access returns `403/404`; tests across two companies.
- **5.1a/5.1b · P1** — global `ValidationPipe` + `class-validator` DTOs (CIDR, ports, MAC, SSH keys, names); edge-case tests. Split by network vs. worker domain.
- **5.4a · P1** — a single source of valid `ResourceStatus` transitions (bug 3.1 stems from the current fragmentation).
- **1.4a/1.4b · P2** — roles + enforcement on destructive operations.
- **5.4b/5.4c · P2** — reuse the state machine in Worker and Zone/Node; invalid transitions rejected and tested.
- **5.3 · P2** — structured logs with `eventId`/`resourceId` end-to-end.
- **5.5 · P2** — idempotent retries and a compensation saga consistent with `ResourceStatus`.
- **6.1 · P2** — host dependency guide (libvirt/KVM, dnsmasq, nftables, `guestfish`, `genisoimage`, `nmap`, `ipcalc`, environment variables) + `Stub*` mode for dev.

---

# 9. Epic: Operations UX 🌟

> **This epic is the product's differentiator.** The thesis: in most IaaS platforms you create a resource and wait blindly. Here, **every operation feels like a Job**: the user sees the steps, the progress, where it's at, what failed and why, and can retry or abort. This applies to **all** resources (Workers, Meshes, Nodes, Fibers, Portals…).
>
> **Only the experience is described here — not the implementation.** The backend already emits events with statuses and failure variants, and there's already a WebSocket: the raw material exists.

## Core concept: the "Operation"

Every action on infrastructure (create, start, stop, update, assign, delete) generates a first-class **Operation**, with:
- a **human title** ("Creating Worker `web-01`"),
- a **sequence of steps** with individual status,
- a **global status** (Queued · In progress · Completed · Failed · Aborted),
- a **result** and, if failed, a **clear reason**,
- **actions** (Retry / Abort) as appropriate,
- **duration** and **affected resources**.

The Operation is visible from three places: the **resource** (its detail view), a **global activity feed**, and **notifications** on completion.

## Example steps per resource (vocabulary, OUX-2)

```
Worker:  Queued → Downloading image → Creating disk → Generating cloud-init
         → Creating VM → Starting VM → Connecting to network → Completed
Mesh:    Queued → Creating bridge → Configuring DHCP → Applying firewall → Completed
Node:    Queued → Reserving IP → Connecting NIC to bridge → Verifying connectivity → Completed
Fiber:   Queued → Validating port → Applying network rule → Completed
```

## Stories

> All are small (~1–2 days). Release: 0.1 = minimal foundation in the MVP; 0.2 = the full experience.

**OUX-1 — Every action creates an observable "Operation" · P0 · Release 0.1**
- Experience: when running any action, the user immediately sees that "something started" and can follow it from the resource, without refreshing. On finishing, sees Completed or Failed.
- Acceptance criteria (experience):
  - Every create/start/stop/delete/assign produces an Operation visible in the resource's detail view.
  - Status updates live.
  - The final status is unambiguous (Completed / Failed).
- Dependencies: none.

**OUX-2 — Intermediate-state vocabulary per resource · P1 · Release 0.1**
- Experience: statuses aren't generic ("processing…"); they reflect the actual step ("Generating cloud-init"). The user understands *what's* happening, not just *that* something's happening.
- Criteria: a step vocabulary defined per resource type exists (at least Worker, Mesh, Node); the UI shows the current step with its human label.
- Dependencies: OUX-1.

**OUX-3 — Global live status without refreshing · P1 · Release 0.2**
- Experience: in any list or dashboard, statuses change on their own as operations progress. An F5 is never needed.
- Criteria: Worker/Zone/Node lists reflect status changes in real time.
- Dependencies: OUX-1.

**OUX-4 — Clear, unambiguous failure indication · P1 · Release 0.1**
- Experience: when something fails, it's seen *red and clear*, not an ambiguous status. The user instantly knows it needs attention.
- Criteria: `FAILED` status with a distinctive color/icon and a one-line reason summary; visible on the resource and in any list.
- Dependencies: OUX-1.

**OUX-5 — Visual operation timeline · P1 · Release 0.2**
- Experience: opening an operation, the user sees a vertical timeline with each step: done (check), current (spinner), pending (dimmed), failed (red cross at the exact step).
- Criteria: per-step status timeline; the step where it failed is marked; can be opened from the resource and from the feed.
- Dependencies: OUX-1, OUX-2.

**OUX-6 — Progress bar / percentage · P2 · Release 0.2**
- Experience: a bar or percentage communicates "how much is left", derived from completed vs. total steps.
- Criteria: a progress indicator consistent with the timeline; never goes backward except on retry.
- Dependencies: OUX-5.

**OUX-7 — Actionable errors · P1 · Release 0.2**
- Experience: the error says *at which step* it failed, *why* in understandable language, and *what the user can do* (retry, check data, contact support).
- Criteria: a failed operation's detail shows step + cause + suggestion; no raw stack traces.
- Dependencies: OUX-5, OUX-14.

**OUX-8 — Retry button · P1 · Release 0.2**
- Experience: on a recoverable failure, a clearly visible "Retry" button relaunches the operation from a safe state.
- Criteria: Retry available only on retryable failed operations; pressing it puts the operation back to "In progress" and the timeline restarts/continues.
- Dependencies: OUX-5.

**OUX-9 — Abort / Cancel button · P2 · Release 0.2**
- Experience: a long or stuck operation can be aborted from the UI, with confirmation, leaving the resource in a consistent state.
- Criteria: Abort available on abortable in-progress operations; confirmation; the resource ends up in a coherent, communicated state.
- Dependencies: OUX-5.

**OUX-10 — Per-resource operation history · P2 · Release 0.2**
- Experience: each resource's detail view has an "Activity" tab with all its past operations, their result, and when they happened.
- Criteria: a chronological per-resource list with final status, date, and access to each one's timeline.
- Dependencies: OUX-1.

**OUX-11 — Global activity feed · P2 · Release 0.2**
- Experience: a central "Activity" view shows everything happening and that happened in the user's infrastructure, filterable by resource/status.
- Criteria: a feed with in-progress and recent operations; filters by resource type and status; links to the resource and the timeline.
- Dependencies: OUX-1.

**OUX-12 — Per-step and total duration · P2 · Release 0.2**
- Experience: the user sees how long each step took and the full operation (useful to understand slowdowns).
- Criteria: the timeline shows per-step and total duration; human format ("1m 12s").
- Dependencies: OUX-5.

**OUX-13 — Resources affected by the operation · P2 · Release 0.2**
- Experience: an operation shows which resources it touches (e.g. assigning a Node affects the Worker and the Zone), with navigable links.
- Criteria: an "Affected resources" section with links; reflects the `EventResource` entries (primary/parent/related).
- Dependencies: OUX-5.

**OUX-14 — Friendly logs · P2 · Release 0.2**
- Experience: if the user wants the detail, they find a readable log ("The image downloaded (312 MB)") instead of raw `virsh`/`nft` output.
- Criteria: per-step messages are in human language; the raw technical detail stays optional/collapsed.
- Dependencies: OUX-5.

**OUX-15 — Consistent visual status system · P1 · Release 0.2**
- Experience: the same colors, icons and labels for each status across the whole app (a `FAILED` looks the same on a Worker, a Node or a Fiber).
- Criteria: a status visual guide applied consistently across all resources and lists.
- Dependencies: OUX-4.

**OUX-16 — Empty states, skeletons and destructive confirmations · P2 · Release 0.2**
- Experience: there's never a confusing blank screen; empty states guide the next action; loads use skeletons; deleting something asks for clear confirmation.
- Criteria: empty states with a call-to-action; skeletons on loads; confirmation when deleting a Worker/Zone/Node.
- Dependencies: none.

**OUX-17 — End-of-operation notifications · P2 · Release 0.2**
- Experience: if the user navigated elsewhere, they get a notice ("Worker `web-01` created" / "Node assignment failed") without having to stay and watch.
- Criteria: a notification (toast/center) when an operation completes or fails, with a link to the resource.
- Dependencies: OUX-1.

---

# 10. Risks

| # | Risk | Impact | Release where mitigated |
|---|--------|---------|-------------------------|
| R2 | **Broken Node flow** → the MVP misses its core goal | High | **0.1** (2.1a/2.1b/2.3) |
| R3 | **Inconsistent Worker creation** | High | **0.1** (3.1) |
| R10 | **Invalid base image** → no VM boots | High | **0.1** (6.3) |
| R6 | Mesh/Zone conceptual mismatch causes rework if decided late | Medium | **0.1** (4.1) |
| R1 | Unauthenticated endpoints exposed if the demo goes public | Critical *if exposed* | **1.0** (1.1) — *bring forward to 0.1 if exposed* |
| R4 | Running `sudo` commands with user data (RCE surface) | Critical | **1.0** (5.1) — audit every route |
| R5 | Partial failures leave orphaned resources (VM with no network, DHCP with no VM) | Medium | **1.0** (5.4/5.5) |
| R7 | Single point of failure: cloud-scripts on one host | Medium | **0.3** health (5.2) · **1.0** multi-host |
| R8 | Secrets in plaintext (`apiKey`) in the DB | Medium | **1.0** (encryption) |
| R9 | No rate limiting on auth/creation | Medium | **1.0** |

---

# 11. Product Vision

> This section describes **how it should feel** to use Marppa Cloud Solution. It's not about architecture or code. It's the compass for every UX decision: whenever there's a design doubt, decide for whatever brings the experience closer to this vision.

## The promise

**"You will never look at your infrastructure and wonder what's happening."**

Infrastructure platforms tend to treat provisioning as a black box: you request a VM, a spinner appears, and minutes later you have something (or a generic error). MCS flips that. Here, **infrastructure is transparent**: everything that happens is visible, explained and recoverable. Creating infrastructure feels less like praying and more like watching a recipe execute step by step.

## The first minute

A user logs in and lands on a **calm, legible dashboard**. There's no wall of options. They see their three pillars — **Meshes** (networks), **Workers** (VMs) and how they connect — and an **activity feed** that tells them, in human language, what happened recently. If it's empty, the screen doesn't leave them lost: it invites them to create their first network or their first VM with a clear path.

## Creating a resource

When they create a **Mesh**, the form is short and honest: a name, a network range. On confirming, **no anonymous spinner appears**. An **Operation** appears: "Creating network `prod-net`", with its steps unfolding — creating the bridge, configuring DHCP, applying firewall rules — each moving from pending to in-progress to done, with a green check. Within seconds, "Completed". The user *understood* what the platform did for them.

Creating a **Worker** feels the same, but richer, because there are more steps: downloading the image, creating the disk, generating the initial config, defining the VM, starting it. The progress bar advances. If the image download takes a while, the user *sees* it — "Downloading image (312 MB)" — and doesn't wonder if it hung. At the end, they're handed their **SSH credentials once**, with a clear warning to save them.

## Connecting a VM to a network

This is the moment where other platforms get confusing. Here it's a simple gesture: from a network, "Assign Worker," pick one from the list of available ones, confirm. The Operation shows the steps that matter — reserving the IP, connecting the network card to the bridge, verifying connectivity — and on finishing, **tells them which IP they got**. The relationship between the VM and the network stops being an abstract concept: it's something the user watched happen.

## Observing status

At any moment, the user can open the **Activity** view and see *everything*: what's running now and what happened before, filterable by resource or status. Every operation is clickable and reveals its **timeline**: the steps, how long each took, which resources it touched. Statuses are **consistent across the whole app** — a failure looks equally red on a Worker, a Node or a Fiber — so the user learns the visual language once and recognizes it everywhere. Nothing requires refreshing: lists change on their own.

## Understanding an error

When something fails — and something always fails — the experience **doesn't punish the user**. There's no stack trace or "Error 500". There's an operation marked in red, with the **exact step** where it broke ("Failed at: Connecting to network"), a **cause in human language** ("The requested IP was already in use"), and a **suggestion**. The user knows what happened and what they can do, without being a network engineer.

## Recovering from a failure

Next to the error there's a **Retry** button. One click, and the operation runs again from a safe point; the timeline comes back to life. If an operation got stuck, there's **Abort**, with confirmation, and the resource ends up in a clean, explicit state — never in a silent limbo. The platform treats failures as a normal part of the work, not an embarrassing exception.

## Managing infrastructure over time

As it grows, the user manages from clear views: their networks with visible IP occupancy, their VMs with their real status, the connections between them. Every resource has its **activity history** — a readable log of everything that happened to it. Destructive operations ask for confirmation. Nothing disappears without a trace; nothing changes without the user being able to see it.

## The final feeling

At the end of a session, the user should feel **control and confidence**: they understood everything they did, saw everything the platform did for them, and never had to guess. If something went wrong, they knew why and how to fix it. That feeling — **"this is transparent, this doesn't lie to me, this lets me see"** — is the product. VMs and networks are the entry table; **operations observability is the main course.**

> **Guiding principle for the team:** for any UX decision, ask: *"Does this help the user understand what's happening, what's missing, whether it failed, why, and how to recover?"* If the answer is yes, it's in the product's direction.

---

## Appendix — Verification notes (iteration 1, traceability)

Findings confirmed by code review in iteration 1 (not run at runtime unless noted):
- **No global guard:** `app.module.ts` only applies `AuthMiddleware` (which doesn't reject); `LoggedInGuard` only on auth/company/user.
- **Node with no event:** `NodeApiService.create` doesn't inject `EventDispatchService`; `NodeService.create` persists `ACTIVE`. Processors exist in cloud-scripts, nobody queues them through this path.
- **Worker `PROVISIONING` vs `QUEUED`:** `WorkerService.createWorker` uses `PROVISIONING`; `status` is a plain field that survives `PrismaMapper.toCreate`; `WorkerCreateProcessor` aborts if `!= QUEUED`. **Confirm at runtime.**
- **No Node UI:** `use-node`/`node.api` consumers are limited to `NodesList` (read-only).
- **No Mesh entity:** `schema.prisma` doesn't define `Mesh`; `Zone` has `cidr`+`gateway` (a single subnet).
- **Seed image:** `apps/back/prisma/seed.ts` defines `ubuntu-24.04` with a 22.04 ISO URL and `virtualizationType: 'iso'`, inconsistent with the cloud images `LinuxHiveService` expects.
