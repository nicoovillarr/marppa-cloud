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

# Conventions

## Naming
- camelCase for variables/functions
- PascalCase for classes/entities
- kebab-case for folders

## TypeScript
- Prefer explicit types over inference in public APIs
- No `any`