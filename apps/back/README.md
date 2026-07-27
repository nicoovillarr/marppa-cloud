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
- a soft delete cannot free a `@unique` column. `Portal.address` pairs with a
  `deletedAt` sentinel (`@@unique([address, deletedAt])`, live rows share the epoch
  default) so a deleted portal stops reserving its domain. Any model that soft-deletes
  a naturally-unique value needs the same treatment.

Portal `apiKey` and `sslKey` are write-only: accepted on create/update, never exposed
in a response model.

# Conventions

## Naming
- camelCase for variables/functions
- PascalCase for classes/entities
- kebab-case for folders

## TypeScript
- Prefer explicit types over inference in public APIs
- No `any`