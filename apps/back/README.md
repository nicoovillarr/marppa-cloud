# Marppa Cloud Solution

This is the API code for Marppa Cloud Solution.

## Stack

- NestJS 11
- Prisma 6.8
- Redis
- PostgreSQL
- TypeScript non-strict
- Clean Architecture + DDD (module-based)
- JWT
- Class Validator
- Class Transform

## Architecture rules

- Each module have its own folder bounds:
```
module
├─ application
│  ├─ models
│  └─ services
├─ domain
│  ├─ entities
│  ├─ repositories
│  └─ services
├─ infrastructure
│  ├─ cache
│  ├─ mappers
│  ├─ repositories
│  └─ services
└─ presentation
    ├─ controllers
    └─ dtos
```
- Each module have its own test

We use Clean Architecture with DDD principles.

### Layers
- **domain**: pure business logic, entities, repositories interfaces, domain services, no dependencies
- **application**: policies, application services
- **infrastructure**: external services, DB, API, cache, mappers, repositories implementations, services implementations
- **presentation**: controllers, dtos

### Rules
- domain must not import from any other layer
- application can import domain
- infrastructure can import application & domain
- presentation can import application & domain

### Data Flow Example

API Controller -> Application Service -> Domain Service -> Domain Repository Interface -> Infrastructure Repository

### Platform administration

Everything CASL knows about is company-scoped: `defineAbilityFor` grants `manage`
on a subject only when the subject's `companyId` matches the caller's, so it can
express "an owner runs their own tenant" but never "someone curates the catalog
every tenant shares". The catalog (worker images, families, flavors, storage
types, atom images, sizes) and the tenant list itself sit outside that model —
they have no owning company by definition.

**A platform admin is an `OWNER` of the root company**, the one whose
`parentCompanyId` is `null` (`c-000001` in the seed). This is a derived property,
not a column: adding a `UserRole.ADMIN` would have meant a migration plus a
second, parallel authorization axis for a role the company hierarchy already
pins down. `PlatformAdminService` resolves it from the session (one indexed
lookup per guarded request), `PlatformAdminGuard` gates the routes, and
`GET /users/me` exposes it as `isPlatformAdmin` so the front can hide the
section — the flag is a UI hint, the guard is the enforcement.

What it gates:

- **`/admin/*`** (the `admin` module): companies, users, host capacity, and a
  read-only cross-company resource listing. The module owns its own Prisma
  repositories rather than reusing `CompanyService`/`UserService`, because those
  run the company-scoped `authorize()` calls that a platform admin needs to step
  outside of. Reusing them would have meant punching a hole in the tenant policy
  that every other caller also goes through.
- **Catalog mutations** — the `POST`/`PUT`/`DELETE` handlers on `hive/images`,
  `hive/families`, `hive/flavors`, `hive/storage-types`, `nucleus/images` and
  `nucleus/sizes`. Reads stay open to any logged-in user: a tenant has to browse
  the catalog to create anything.

Guardrails live in the domain services, not the UI:

- **Only the seeded root company has no parent.** `POST /admin/companies` ignores
  any parent in the body and hangs the new company off the root; an update that
  tries to null a parent out is a `409`. Both matter because "no parent" *is* the
  admin grant — otherwise creating a tenant with the parent field left blank
  would silently mint a second company whose owners are platform admins. The
  explicit-`null` case needs its own check rather than a DTO rule: class-validator's
  `@IsOptional()` skips validation on `null` as well as `undefined`, so
  `{"parentCompanyId": null}` sails past `@IsString()`.
- The root company cannot be deleted or reparented, a company with users or
  resources cannot be deleted, and a company cannot be moved under its own
  descendant.
- A company cannot be left without an `OWNER`, and an admin cannot demote or
  delete their own account.
- **Changing a password, role, company or email revokes the user's sessions**
  (`revokeSessions`, mirroring what a delete already did). Without it a password
  reset is theatre: refresh tokens live 7 days and `tick` keeps rotating them, so
  whoever held the old session keeps it. Role and company changes also carry a
  stale-JWT window of up to the 15-minute access-token TTL, since CASL reads
  `companyId` off the token — dropping the sessions closes it.
- **Host capacity rows are bounded and hostname-shaped** (`MAX_HOST_*` in
  `host-capacity.config.ts`). `HostCapacityService.budget()` sums every row, so an
  unbounded write is a way to overcommit the host into OOM rather than a typo.
- **Catalog rows in use cannot be deleted.** Worker images check their workers,
  storage types check images and disks, atom images check their atoms — each a
  `409` instead of a foreign-key error surfacing as a 500.
- **Forbidden capabilities are refused at catalog-write time**, not only when an
  atom tries to use them. `AtomService` and the worker still grade capabilities on
  create and start (that is the enforcement); rejecting them on the way in stops an
  image being approved that could never run.
- **Every admin mutation is recorded** through `EventDispatchService.record()`, a
  persist-without-enqueue sibling of `dispatch()`. Admin actions have no host work
  to do, so putting them on the BullMQ queue would hand cloud-scripts events no
  processor claims; they are audit rows, not jobs. They land on the acting admin's
  company — the root one — because `Event.companyId` is required.

### Catalog visibility

`GET /hive/families` answers from the caller: a tenant sees public families plus
its own, active only, while a platform admin sees every family from every company.
Without that branch the admin dashboard could not administer a private family — it
could not see one. `includeDeprecated=true` on families, flavors and sizes opts
into deprecated rows, which the tenant-facing listings still hide. The admin UI
passes it, so "deprecate" reads as a state change there rather than a row
vanishing, and a deprecated row can be restored (`POST .../:id/restore`) instead of
needing SQL. Restoring a flavor whose family is still deprecated is a `409`.

### Infra resource lifecycle

Any resource whose real state lives on the host (zones, nodes, workers, portals,
transponders) follows one rule, encoded in `EVENT_STATE_MACHINE`
(`@marppa-cloud/api-types`) and shared with the cloud-scripts processors:

- the backend writes `getEventStateTransition(<EVENT>).entry` on the row **before**
  dispatching the event; the processor validates exactly that status as its
  precondition and refuses to act otherwise. Never hardcode a `ResourceStatus` at a
  dispatch site — a value that drifts from the map silently disables the processor.
- **delete is a status change, not a row removal.** The processor still needs the row
  to tear down host config, so `delete()` queues `<RESOURCE>_DELETE` and the processor
  is what finally sets `DELETED`. Repositories filter `DELETED` out of reads, which is
  what makes the row invisible to the API. There is deliberately no `delete()` on the
  orbit repositories: a hard delete leaves an orphan config file on the host, only
  reclaimable by a reconcile.
- reads are company-scoped in the **domain** service (`assertOwnership`), not in the
  controller, so every caller inherits it. A resource owned by another company answers
  `404`, never `403` — a `403` confirms the id exists.
- a foreign key accepted from a request body is an ownership hole until it is checked.
  Resolve it through the owning service (`NodeService.findByIdForCaller`), never trust
  the id. A `Node` carries no `ownerId` of its own — it inherits its zone's. The same
  applies to an `ownerId` in a body: accept it only when it equals the caller's company.
  `HiveModule` imports `MeshModule`, so mesh cannot import hive back to validate a
  `workerId`; `NodeRepository.findWorkerOwnerId` reads that one column directly instead
  of introducing a `forwardRef` cycle, mirroring how hive's repository already joins
  `Node` rows.
- a rule enforced in more than one process belongs in `@marppa-cloud/shared`, never
  copy-pasted. Two of them had already drifted: the OpenSSH public key pattern existed in
  four places, and the strictest copy rejected keys the API had accepted, so the worker
  only failed once its event was queued; and the BullMQ job id was built as `event-<id>`
  by the backend but as a bare number by the worker, which BullMQ rejects outright
  ("Custom Id cannot be integers"), silently breaking every follow-up enqueue including
  the one that marks a job failed.
- a soft delete cannot free a `@unique` column. `Portal.address` pairs with a
  `deletedAt` sentinel (`@@unique([address, deletedAt])`, live rows share the epoch
  default) so a deleted portal stops reserving its domain. Any model that soft-deletes
  a naturally-unique value needs the same treatment.

Portal `apiKey` and `sslKey` are write-only: accepted on create/update, never exposed
in a response model.

### Hive catalog (families, flavors, capacity)

Hardware is chosen from a catalog — `WorkerFamily` (a hardware profile) with its
`WorkerFlavor` sizes — never typed in free-form per VM. Discrete sizes are what make
bin-packing, capacity accounting and (later) per-hour pricing tractable; arbitrary
CPU/RAM/disk triples are an untestable surface and fragment the host. The escape hatch
for a tenant that genuinely needs another shape is a **private family**, not a slider.

- **Flavors are immutable.** `PUT /hive/flavors/:id` does not rewrite the row: it inserts
  a new row with the same `name`, `version = max + 1`, and stamps `deprecatedAt` on the
  previous one. Rationale: `Worker.flavorId` is a pointer, so editing specs in place
  would silently resize every existing worker on its next recreate, and would rewrite
  the history a bill is derived from. Only one active version per `(familyId, name)` is
  expected; that invariant lives in `WorkerFlavorService`, not in a database constraint
  (Prisma cannot express a partial unique index, and the flavor catalog is a
  single-writer admin flow).
- **Workers snapshot their specs.** `Worker.cpuCores/ramMB/diskGB` are copied from the
  flavor at create time and are what cloud-scripts provisions from. A worker created
  before a revision keeps its original size for its whole life; the flavor relation is
  kept only for lineage and pricing.
- **Deprecation replaces deletion.** `DELETE` on a family or flavor stamps `deprecatedAt`
  (a family also deprecates its active flavors). Deprecated entries disappear from the
  catalog listing but stay resolvable by id, so existing workers keep working. Creating a
  worker on a deprecated flavor is a `409`.
- **A family may be private.** `WorkerFamily.ownerId` is nullable: `null` is a public
  family, a company id restricts it to that company. Listings return public families plus
  the caller's own; a private family belonging to another company answers `404`, and an
  `ownerId` in a create body is only accepted when it equals the caller's company.
- **Architecture is a family property.** A worker is rejected when the image's
  `architecture` differs from the family's, which is also what the create form filters
  instance types by. Accepted values live in `WORKER_ARCHITECTURES`
  (`@marppa-cloud/api-types`), alongside the `MIN_WORKER_*` floors the flavor DTOs
  validate. The disk floor exists because a copied cloud image cannot be shrunk with
  qcow2 — a flavor smaller than the base image fails at provisioning time.
- **Disk is not part of a flavor.** A flavor is a CPU × RAM shape; there is no `diskGB`
  column on it. The boot disk is one platform-wide value, `WORKER_BOOT_DISK_GB`
  (`getWorkerBootDiskGB()`, default 20, floored at `MIN_WORKER_DISK_GB` because a copied
  cloud image cannot be shrunk with qcow2). A workload that needs space gets an extra
  volume rather than being pushed into cores it does not need.

  `Worker.diskGB` still exists and is still a snapshot: raising the default does not
  resize existing workers, and cloud-scripts grows the copied base image to the worker's
  own value. The UI does not print the number before create — it says the boot disk is
  fixed and shows the real size on the worker itself. If it should be visible up front,
  that wants a small `GET /hive/config`, not a duplicated constant in the frontend.

  The growth path is `WorkerDisk`, which is **not wired to provisioning yet** — it has
  CRUD in the backend, nothing reads it, and its `isBoot` flag is unused. Until it is,
  `WORKER_BOOT_DISK_GB` is a hard ceiling for every worker.
- **Capacity is checked before an event is queued.** `HiveCapacityService` compares the
  requested specs against the host budget and the sums already committed in the database:
  on create it checks disk (the image file is allocated at create) and that the flavor
  could ever fit at all; on start it checks memory and vCPU against everything currently
  running, since RAM is only consumed while the domain is up.

  **The budget is measured, not configured.** The backend cannot see the host — it does
  not run on it — so cloud-scripts' host preflight measures cores, total RAM and the size
  of the images volume at startup (and on every system reset) and upserts a `HostCapacity`
  row. `HiveCapacityService` sums those rows. Nothing is held back for the host, atoms or
  anything else running outside the platform: the budget is the machine's full capacity.

  With more than one row the sum is a **pool bound, not a placement guarantee** — a
  worker that fits "the total" may not fit any single host. That is the point where a
  scheduler has to exist; until then there is one row.

  The environment only holds policy and the fallback used while no host has reported yet
  (a fresh database, or `USE_STUBS=true`, which skips the preflight entirely):

  | Variable | Default | Meaning |
  |---|---|---|
  | `HIVE_VCPU_OVERCOMMIT` | `2` | Multiplier applied to reported cores. A policy, not a measurement. |
  | `HIVE_HOST_VCPU` | `12` | Fallback cores, used only when no `HostCapacity` row exists. |
  | `HIVE_HOST_RAM_MB` | `32026` | Fallback memory, same condition. |
  | `HIVE_HOST_DISK_GB` | `439` | Fallback disk, same condition. |
  | `WORKER_BOOT_DISK_GB` | `20` | Boot disk every worker gets. Snapshotted per worker at create. |

  cloud-scripts also re-checks the real host with `df` and `free` before it copies a disk
  or starts a domain; that check is the one that sees current usage, including whatever
  runs outside the platform. The backend check exists to answer `409` immediately instead
  of failing an event five retries later.

  Workers and atoms both count against it (`CommittedResourcesRepository` sums the two
  tables), which is why the service lives in the shared module rather than in hive. Atoms
  contribute CPU and memory only. Per-company quotas do not exist: the budget is
  host-wide, so one company can consume all of it.

### Nucleus (atoms)

An `Atom` is a Docker container, and it sits in the mesh exactly where a worker
does: it needs a `Node` in an `ACTIVE` zone, it is addressed with that node's IP
on the zone bridge, and a port is reachable from outside only through a `Fiber`.
Three consequences shape the module:

- **Only approved images run.** `Atom.imageId` is a foreign key into `AtomImage`,
  and approval is what writing a catalog row means. The seed still ships the
  baseline list and prunes any row that has dropped off it, but the catalog is no
  longer read-only over HTTP: `POST/PUT/DELETE /nucleus/images` exist for the
  admin dashboard and are gated by `PlatformAdminGuard`, so approving an image is
  a root-company action rather than a deploy. A `DELETE` is refused with `409`
  while any atom still points at the image, since the relation is what the
  processors resolve from — never event data. An image's extra kernel privileges
  (`capabilities`, `sysctls`) live on the catalog row too, so approving an image
  approves what it may ask of the host.
- **Capabilities are graded by blast radius** (`@marppa-cloud/shared`, enforced by
  both the backend and the worker). Forbidden ones are root on the host by
  another name (`SYS_MODULE`, `SYS_ADMIN`, …) and are refused whatever the
  catalog says — one `insmod` unloads the nftables rules that isolate every zone.
  Tenant-safe ones stop at the container's network namespace and the zone around
  it, which only ever holds one company's resources, so the worst case is
  self-inflicted. **Everything else is root-company only by default**, so a
  capability nobody classified is restricted rather than overlooked. On top of
  that every container runs `--cap-drop ALL` plus a minimal baseline that excludes
  Docker's default `NET_RAW`, which is what keeps `NET_ADMIN` tenant-safe: without
  `AF_PACKET` an atom cannot capture packets or forge ARP on its zone bridge.
- **Resources come from a catalog, like a worker's.** `AtomSize` (nano/small/medium/
  large) is immutable and versioned the same way `WorkerFlavor` is: a revision inserts a
  new version and deprecates the old row. Every `AtomImage` names a `defaultSizeId`, so
  `POST /nucleus/atoms` usually omits `sizeId` and gets a size that suits the image
  (postgres large, wg-easy nano); passing one picks another size from the catalog.
  `Atom.cpuCores`/`ramMB` are a snapshot, and they are what `docker run --cpus/--memory`
  receives — before this, every container got the same `ATOM_CPU_LIMIT`/`ATOM_MEMORY_LIMIT`
  regardless of what it ran. Atoms now count against the host budget (`HostCapacityService`,
  shared module) on create and start; they take no disk from it, since a container's
  writable layer is not sized up front.
- **Docker never manages the firewall.** The daemon runs with `iptables: false`;
  egress NAT and port publishing come from the mesh's own nftables rules, so
  Docker cannot clobber `inet filter` / `ip nat` (rewritten on every zone and
  fiber change) or fail2ban's `inet f2b-table` (wiped by `SYSTEM_RESET`'s base
  ruleset). `-p` / `--publish` must never appear in a `docker run`. See
  `apps/cloud-scripts/deploy/README.md` for the daemon config and the checks that
  enforce it.
- **`AtomImage.command` overrides the image's default CMD.** Left empty for
  images whose own entrypoint is already a long-running daemon (postgres,
  redis, wg-easy). Base OS images like `ubuntu` default to a bare shell that
  exits the instant it hits EOF on an unattached stdin — `--restart
  unless-stopped` then just respawns it forever, and there is never a running
  container for `docker exec` to reach. The seeded `ubuntu-24.04` row sets
  `command: ['sleep', 'infinity']` for exactly this reason.
- **The container is rebuilt from the row on every `ATOM_START`.** That is why
  there is no `ATOM_UPDATE`: a rename or an env change is a plain DB write that
  applies on the next start, and both are refused while the atom is not
  `INACTIVE`. It also means an atom-backed `Node` has no host work to do at
  assign time, so it is created `ACTIVE` with no assign event — but it cannot be
  deleted while its atom is live, or its IP would be handed out twice.

`AtomEnvVar` values are stored in clear text, like `Portal.apiKey`: they are
secrets to the guest, not to the platform operator, and the processor needs them
verbatim to build the container.

**The isolation boundary is the zone, not the atom.** `br_netfilter` is not
loaded on the host, so traffic between containers on the same bridge never
reaches nftables and no rule can filter it: atoms sharing a zone see each other's
ports, and Docker's `enable_icc` is inert under `iptables: false`. Different
companies never share a zone (`Zone.ownerId`, and `NodeService.create` checks the
atom's owner), and zone-to-zone is dropped by the mesh's RFC1918 rules — so this
is a within-company property. Two workloads that must not see each other belong
in different zones. Related known gap: a `Fiber` accepts any source address, so
publishing a port publishes it to everyone who can route to the host.

# Conventions

## Naming
- camelCase for variables/functions
- PascalCase for classes/entities
- kebab-case for folders

## TypeScript
- Prefer explicit types over inference in public APIs
- No `any`