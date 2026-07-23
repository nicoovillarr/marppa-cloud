---
name: modules
path: src/modules
description: Estructura y convenciones para los módulos del backend (orientado a desarrolladores y agentes/autómatas).
---

## Descripción

Este documento describe la arquitectura, las convenciones y las prácticas recomendadas para los módulos dentro de `src/modules`. Está pensado tanto para desarrolladores humanos como para herramientas automatizadas (IA/agents) que consuman metadatos y ejemplos para entender y manipular el código.

## Estructura de un módulo

Cada módulo sigue la misma organización mínima y predecible:

### Aplicación:

Casos de uso y servicios de orquestación (API services). Coordina domain ↔ infrastructure.

### Dominio:

Núcleo de negocio. Contiene:

- `entities`: modelos de negocio puros.
- `repositories`: interfaces (puertos) para persistencia.
- `services`: domain services que encapsulan lógica compleja e invariantes.

### Infraestructura:

Adaptadores técnicos. Contiene:

- `cache`: adaptadores para cache como Redis.
- `mappers`: conversores entre modelos de persistencia y entidades de dominio.
- `repositories`: implementaciones concretas (Prisma/ORM).
- `services`: integraciones técnicas (clients externos, adapters).

### Presentación:

Capa de entrada/salida. Contiene `controllers` y `dtos` (validación y transformación de payloads).

### Ejemplo esquemático:

```
module
├─ application
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

## Principios y patrones

### Patrón Hexagonal / Ports & Adapters:

Las interfaces de persistencia y servicios externos se definen en `domain` y se implementan en `infrastructure`.

### Separación clara:

Lógica de negocio en `domain` (+ domain services), orquestación en `application`, y transporte/validación en `presentation`.

### Entidades puras:

Las clases/objetos en `domain/entities` no dependen de frameworks, librerías de persistencia ni DTOs.

### Mappers en `infrastructure`:

Toda transformación entre la capa técnica y el dominio se hace aquí.

### DTOs y validaciones:

Solo en `presentation` usando `class-validator`/`class-transformer`.

## Tecnologías y dependencias comunes

- Framework: `@nestjs/*` (controllers, modules, providers).
- Persistencia: `prisma` como ORM (o adaptadores que implementen los repositorios).
- Validación/transformación: `class-validator`, `class-transformer`.
- Cache: `in-memory` para development y `redis` para producción.
- Logging/telemetría: `rollbar`.

## Convenciones de código

### Nombres:

Usar `PascalCase` para entidades (`User`), `camelCase` para métodos y variables. Los nombres de archivos deben reflejar la clase/función que contienen (`user.entity.ts`), usando `kebab-case`.

La implementación de un repositorio debe contener el nombre de la tecnología usada, p. ej. `UserPrismaRepository`.

### Interfaces de repositorio:

Nombres descriptivos sin prefijo: `UserRepository`.

### Uso de alias:

Configurar `tsconfig.json` para usar alias en cada módulo (`@/user/*`, etc).

Los imports en cada archivo deben usar estos alias para mejorar la legibilidad, ordenando primero imports externos, luego módulos internos y finalmente el módulo actual. Todos los imports deben estar ordenados alfabéticamente dentro de su grupo, y cada grupo separado por una línea en blanco.

## Machine-friendly metadata

Para facilitar la ingestión por agentes, incluí un bloque YAML al inicio con claves: `name`, `path` y `description`. Las IA pueden extraer estas claves para indexar módulos. Mantener este bloque simple y estable.

Además, se recomienda mantener estos subtítulos exactos (_Descripción_, _Estructura de un módulo_, _Principios y patrones_, _Tecnologías y dependencias comunes_, _Convenciones de código_, _Guía rápida_, _Checklist_) para permitir parsing determinista.

## Guía rápida

### Añadir un nuevo módulo

1. Crear carpeta `src/modules/<module-name>` con subcarpetas: `application`, `domain`, `infrastructure`, `presentation`.
2. Definir entidades en `domain/entities` y las interfaces de repositorio en `domain/repositories`.
3. Implementar repositorios y mappers en `infrastructure` (ej. Prisma models ↔ entidades).
4. Añadir casos de uso en `application` que invoquen `domain` y los puertos.
5. Exponer endpoints en `presentation/controllers` y definir `dtos` para validación.
6. Agregar tests: unitarios en `domain`/`application`, integración para `infrastructure`.

### Checklist de revisión

- `domain/entities` no importan nada de `infrastructure` ni de `presentation`.
- Reglas de negocio implementadas únicamente en `domain` o `domain/services`.
- Controllers delegan a `application`; no contienen lógica de negocio.
- Todas las interfaces de repositorio en `domain` tienen una implementación en `infrastructure` o un mock en tests.
- DTOs usados solo en `presentation`.

## Sugerencias para agentes/IA que procesen este README

- Extraer el bloque YAML al inicio como metadatos primarios.
- Buscar subsecciones por título exacto para mapear: `Estructura de un módulo`, `Guía rápida`, `Checklist`.
- Si se generan scaffolds, mantener la plantilla de carpetas y nombres exactos para compatibilidad con el resto del repositorio.
