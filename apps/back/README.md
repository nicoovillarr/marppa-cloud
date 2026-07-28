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

### Nucleus (atoms)

An `Atom` is a Docker container, and it sits in the mesh exactly where a worker
does: it needs a `Node` in an `ACTIVE` zone, it is addressed with that node's IP
on the zone bridge, and a port is reachable from outside only through a `Fiber`.
Three consequences shape the module:

- **Only approved images run.** `Atom.imageId` is a foreign key into `AtomImage`,
  a catalog with no write endpoints — the seed's list *is* the approval, and it
  prunes any row that has dropped off it. An image's extra kernel privileges
  (`capabilities`, `sysctls`) live on the catalog row too, so approving an image
  approves what it may ask of the host. The processors resolve the image through
  the relation, never from event data.
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