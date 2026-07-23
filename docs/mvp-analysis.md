# Análisis MVP y Roadmap — Marppa Cloud Solution

> Documento de análisis arquitectónico, plan de releases y visión de producto.
> Autor del análisis: Software Architect / Principal Product Engineer (revisión estática del repositorio).
> Fecha de análisis: 2026-07-14 · **Iteración 2** (refinamiento de roadmap): 2026-07-14.
> **Este documento no modifica código.** Es únicamente análisis y planificación.

---

## Cómo leer este documento

- **Secciones 1–7** (Resumen → Funcionalidades faltantes): análisis del estado actual. Se asumen correctas y no se re-verificaron en esta iteración.
- **Sección 8 — Plan de Releases:** el backlog reorganizado en **cuatro releases** (0.1 MVP → 0.2 UX → 0.3 Features → 1.0 Hardening). **Es la fuente de verdad del roadmap.**
- **Sección 9 — Epic: Operations UX:** el epic nuevo que convierte la observabilidad de operaciones en el diferencial del producto.
- **Sección 10 — Riesgos.**
- **Sección 11 — Visión del Producto:** cómo debe *sentirse* usar la plataforma. Guía para todas las decisiones de UX.

> **Nota de la iteración 2:** el backlog anterior mezclaba "construir un MVP" con "preparar un producto enterprise". Esta versión los separa. El norte del producto es: **infraestructura totalmente observable — cada operación se siente como un Job con timeline, progreso, errores claros y recuperación.**

---

# 1. Resumen ejecutivo

Marppa Cloud Solution (MCS) es una plataforma de infraestructura tipo IaaS, en fase temprana pero **sorprendentemente madura en su núcleo técnico**. No es un esqueleto: contiene aprovisionamiento real de máquinas virtuales sobre **libvirt/KVM** (`virt-install`, `cloud-init`, `qemu-img`), redes virtuales reales sobre **bridges de Linux + dnsmasq (DHCP) + nftables (NAT/port-forwarding)**, un sistema de eventos asíncrono robusto sobre **BullMQ/Redis** con reintentos y notificación por WebSocket, y un frontend Next.js con dashboards funcionales.

La arquitectura es sólida (hexagonal / clean architecture por módulos, separación back ↔ orquestador ↔ front vía cola de eventos). El proyecto está **más avanzado de lo que sugieren los commits**.

El MVP hoy **no está funcional de extremo a extremo** por tres bloqueadores concretos:

1. **El flujo estrella (conectar Worker ↔ Mesh vía Node) está roto en la orquestación:** crear un Node escribe en base de datos con estado `ACTIVE` pero **no dispara ningún evento**, por lo que la reserva DHCP y el cableado de la NIC al bridge (implementados en `cloud-scripts`) nunca corren. El Node queda como registro fantasma. Además no existe UI para crear/asignar Nodes.
2. **Inconsistencia en la creación de Workers:** el back crea el Worker en `PROVISIONING`, pero `WorkerCreateProcessor` aborta si el estado no es `QUEUED`. Estáticamente, el aprovisionamiento parece fallar siempre (verificar en runtime).
3. **Imagen base inconsistente:** la imagen seed apunta a una ISO de Ubuntu server en lugar de una cloud image qcow2; sin corregirlo, no arranca ni una VM.

Existe además un **desajuste conceptual**: **no hay entidad "Mesh"**. "Mesh" es solo el nombre del módulo; la entidad de red real es **`Zone`**, que representa **una única subred** (`cidr` + `gateway`). El "Mesh que contiene múltiples subredes/reglas" **no está modelado** — es una decisión de producto pendiente.

**El resto del sistema (seguridad, RBAC, observabilidad avanzada, multi-host) NO es necesario para un MVP demostrable** y se difiere a la release de Hardening.

**Veredicto:** base técnica excelente. El camino al MVP no es construir cimientos, sino **cerrar el flujo Node, estabilizar la creación de Worker, y hacer que cada operación sea observable**. Con foco, el MVP es alcanzable en pocas iteraciones.

---

# 2. Estado actual del proyecto

## Monorepo (npm workspaces)

```
apps/
  back/           NestJS — API REST + dominio + despacho de eventos
  cloud-scripts/  Orquestador — consume eventos (BullMQ) y ejecuta comandos Linux reales
  front/          Next.js (App Router) — dashboards
packages/
  db/             Prisma schema + migraciones (PostgreSQL)
  api-types/      Tipos compartidos back ↔ front
  shared/         Utilidades compartidas
```

## Madurez por aplicación

| App | Madurez | Observaciones |
|-----|---------|---------------|
| `back` | **Alta** | Arquitectura hexagonal completa por módulo. Tests unitarios presentes. |
| `cloud-scripts` | **Alta (técnica)** | DI propio, procesadores por evento, implementaciones `Linux*` reales + `Stub*` para desarrollo. Aprovisionamiento real de VMs y red. |
| `front` | **Media** | Dashboards, formularios, tablas, WebSocket, generación de claves SSH. Faltan pantallas clave (asignación de Node, Fibers). |
| `packages/db` | **Alta** | Modelo de datos rico y coherente; 3 migraciones aplicadas. |

## Señales de "trabajo en curso"
- `front/middleware.ts` es un **no-op** (no protege rutas).
- Entidades en el schema sin módulo backend (`Atom` → "Nucleus"/"Nibble", no implementado).
- Guard de autenticación aplicado de forma **inconsistente** (solo auth/company/user).

---

# 3. Arquitectura encontrada

## Patrón general: CQRS-lite dirigido por eventos

```
┌──────────┐   REST    ┌──────────────┐   escribe DB + encola   ┌───────────┐
│  front   │ ────────▶ │     back     │ ──────────────────────▶ │  Redis /  │
│ (Next.js)│           │  (NestJS)    │      (BullMQ)           │  BullMQ   │
└──────────┘           └──────────────┘                         └─────┬─────┘
     ▲                        │                                       │ consume
     │  WebSocket (estado)    │ Prisma                                ▼
     │                        ▼                              ┌──────────────────┐
     └──────────────────────────────────────────────────────│  cloud-scripts   │
                          PostgreSQL  ◀─────────────────────│  (orquestador)   │
                                         actualiza estado    │  libvirt/nft/... │
                                                             └──────────────────┘
```

**Flujo canónico (crear Worker):** front `POST /hive/workers` → `WorkerApiService` persiste + `EventDispatchService.dispatch(WORKER_CREATE)` → BullMQ → `EventWorker` (cloud-scripts) resuelve procesador → `WorkerCreateProcessor` llama a `LinuxHiveService` (imagen, cloud-init, `virt-install`) → actualiza estado en DB y **empuja WebSocket** al front.

Cada módulo del back repite: `domain / application / infrastructure / presentation`. El orquestador usa un **DI propio** con `@EventProcessor(EventType.X)`. Los servicios de infraestructura tienen doble implementación `Linux*` (producción) / `Stub*` (dev). Máquina de estados unificada `ResourceStatus`: `INACTIVE, QUEUED, PROVISIONING, UPDATING, ACTIVE, FAILED, TERMINATING, TERMINATED, DELETING, DELETED`.

**Relación clave del MVP:** `Node` = (`ipAddress` único) + FK a `Zone` + FK opcional única a `Worker`. Es el concepto "Node" del pedido (conecta una VM a una red). `Fiber` = regla de port-forwarding sobre un Node.

---

# 4. Comparación con Cockpit (capacidades)

| Capacidad (referencia Cockpit) | Estado en MCS | Comentario |
|---|---|---|
| Virtualización — crear VM | **Existe** | `virt-install` + cloud-init reales (con el bug de estado a resolver). |
| Ciclo de vida (start/stop/delete) | **Existe** | Eventos + `virsh`. |
| Editar recursos (CPU/RAM/disco) | **Parcial** | Ejecución existe en `LinuxHiveService`; el flujo de update solo cambia el nombre. Sin UI. |
| Consola / acceso | **Parcial** | Lectura de consola serie (diagnóstico) existe; sin consola web. Acceso por SSH. |
| Redes — bridges / interfaces | **Existe** | Bridge por Zone. |
| Redes — DHCP / rangos IP | **Existe** | dnsmasq con rango y reservas por MAC. |
| Redes — firewall / NAT / port-forward | **Existe** | nftables (masquerade + DNAT vía Fibers). Sin UI. |
| Redes — asignar VM a red | **Parcial / roto** | Modelo y ejecución existen; **el flujo no dispara el evento** y no hay UI. |
| Administración de host físico | **Falta** | El host es implícito. |
| Almacenamiento (volúmenes) | **Parcial (fuera de MVP)** | Modelado; sin CRUD/attach. |
| Estados de recursos | **Existe** | `ResourceStatus` + WebSocket. **Fortaleza.** |
| Monitoreo en vivo (CPU/RAM/red) | **Falta** | Sin métricas. |
| Logs / journal para el usuario | **Falta** | Existe historial de `Event`. |
| Terminal web / updates de host / contenedores | **No aplica MVP** | — |
| Cuentas / sesiones | **Parcial** | JWT + `Session`; sin gestión de usuarios/roles en UI. |

**Lectura:** MCS ya cubre virtualización y redes al nivel de Cockpit, con la ventaja de ser multi-tenant y asíncrono. Lo que toca el MVP y falta: cerrar el flujo VM↔red y hacer visible el estado de cada operación.

---

# 5. Funcionalidades existentes

Leyenda: ✅ completa · 🟡 parcial · 🔴 rota/inexistente

**Auth/multi-tenancy:** ✅ login JWT + `Session` + Argon2 · ✅ contexto por request (ALS) · 🟡 `LoggedInGuard` solo en auth/company/user · 🟡 modelo multi-tenant sin filtrado por tenant · 🔴 sin RBAC · 🔴 `front/middleware.ts` no-op.

**Hive/Workers:** 🟡 crear (bug de estado) · ✅ listar/detalle · ✅ start/stop/delete · 🟡 update (solo nombre) · ✅ catálogo Families/Flavors/Images · 🟡 discos modelados sin CRUD.

**Mesh/Zones:** ✅ crear/listar/detalle/actualizar/eliminar Zone · ✅ validar Zone · 🔴 **crear/asignar Node no dispara evento** · 🔴 sin UI de Node · 🟡 Fibers completos en back, **sin UI**.

**Orbit (Portals/Transponders):** ✅ CRUD + eventos + ejecución + UI. ℹ️ **Fuera del alcance del MVP.**

**Sistema de eventos:** ✅ despacho, BullMQ, reintentos, backoff, diferido por estado del padre, variantes de fallo, historial `Event`, WebSocket. **Punto fuerte.**

**Frontend:** ✅ design system propio, tablas async, diálogos, formularios, WebSocket provider · ✅ dashboards hive/mesh/orbit y login · ✅ generación de claves SSH en cliente.

---

# 6. Funcionalidades faltantes (resumen)

Detalladas y priorizadas en el Plan de Releases (§8). En orden de impacto: (1) reparar el flujo Node, (2) UI de asignación Worker↔Zone, (3) estabilizar creación de Worker, (4) imagen base válida, (5) definición de "Mesh", (6) **observabilidad de operaciones (nuevo diferencial)**, (7) feedback de errores en UI, (8) UI de Fibers, (9) seguridad/RBAC, (10) validaciones, (11) monitoreo, (12) observabilidad operativa.

---

# 7. Marco del Roadmap

## 7.1 Escala de prioridades (estricta)

| Prioridad | Significado | Regla |
|-----------|-------------|-------|
| **P0** | Sin esto el MVP **literalmente no funciona**. | Solo bloqueantes del camino feliz de: crear Mesh → crear Worker → conectar vía Node → verlo suceder. |
| **P1** | **Mejora muchísimo** el producto (calidad percibida o riesgo real). | No bloquea la demo, pero sin esto el producto se siente incompleto o inseguro. |
| **P2** | **Muy bueno tenerlo.** | Pulido, comodidad, capacidades adicionales. |
| **P3** | **Roadmap futuro.** | Fuera del horizonte 1.0. |

> Deliberadamente hay **pocos P0**. Si todo fuera P0, nada lo sería.

## 7.2 Las cuatro releases

| Release | Nombre | Objetivo | Criterio de "listo" |
|---------|--------|----------|---------------------|
| **0.1** | **MVP** | Que un usuario cree una red, cree una VM, la conecte, la administre y **entienda qué ocurre** en cada operación. | Demo end-to-end funcional del camino feliz. |
| **0.2** | **UX** | Que usar la plataforma sea un **placer**: timeline de jobs, progreso, errores claros, retry, dashboards, info de red. | La observabilidad de operaciones es excelente. |
| **0.3** | **Features** | **Más capacidades**: Fibers, edición de recursos, monitoreo, almacenamiento. | El producto hace más cosas. |
| **1.0** | **Hardening** | Lo que un usuario final no necesita para *probar*: seguridad, RBAC, auditoría, máquina de estados, idempotencia, correlación de logs, escalabilidad, multi-host. | Producción-ready. |

**Regla de oro:** ningún ítem de 0.1 depende de un ítem de una release posterior.

---

# 8. Plan de Releases (backlog)

> Cada ítem conserva su **ID de origen** (para trazabilidad con la iteración 1). Los ítems marcados con `▸ split` fueron divididos por superar ~1–2 días de trabajo. Los `OUX-*` pertenecen al Epic Operations UX (§9). Campos por ítem: descripción · objetivo · criterios de aceptación · prioridad · dependencias.

---

## 🟢 Release 0.1 — MVP

**Meta:** camino feliz completo y observable. Un usuario logueado puede: crear una red (Mesh/Zone), crear un Worker, conectarlo a la red vía Node, administrarlos, y **ver el estado de cada operación mientras sucede**.

### Contenido y prioridades

| ID | Título | Prioridad |
|----|--------|-----------|
| 3.1 | Estado inicial del Worker compatible con el procesador | **P0** |
| 6.3 | Imagen base cloud válida | **P0** |
| 2.1a | Alta de Node dispara `NODE_ASSIGN_WORKER` | **P0** |
| 2.1b | Transiciones de estado y evento de fallo del Node | **P0** |
| 2.3a | UI: seleccionar y asignar un Worker a una Zone | **P0** |
| 4.1 | Decisión de producto: qué es un "Mesh" | **P0** |
| OUX-1 | Toda acción crea una "Operación" observable | **P0** |
| 2.3b | UI: IP asignada y estado en vivo de la asignación | **P1** |
| 2.2 | Desasignar Node dispara `NODE_UNASSIGN_WORKER` | **P1** |
| 2.4 | UI: gestionar/desasignar Node | **P1** |
| 2.5 | Validaciones de asignación (worker ya asignado, IP en rango) | **P1** |
| 4.2 | Alinear vocabulario Mesh/Zone en UI y API | **P1** |
| OUX-2 | Vocabulario de estados intermedios por recurso | **P1** |
| OUX-4 | Indicación clara e inequívoca de fallo | **P1** |

### Detalle

**3.1 — Estado inicial del Worker compatible con el procesador · P0**
- Descripción: la creación construye el Worker en `PROVISIONING`; el procesador aborta si no es `QUEUED`.
- Objetivo: la creación de Worker completa el aprovisionamiento de punta a punta.
- Criterios: crear deja el Worker en `QUEUED`; el procesador transiciona `PROVISIONING → INACTIVE` y define la VM; test de integración del flujo con `StubHiveService`.
- Dependencias: ninguna.

**6.3 — Imagen base cloud válida · P0**
- Descripción: la imagen seed usa una ISO de Ubuntu server, no una cloud image qcow2 compatible con `virt-install --import`.
- Objetivo: catálogo de imágenes coherente con cloud-init.
- Criterios: la imagen por defecto es una cloud image qcow2 válida; el flujo de creación arranca la VM.
- Dependencias: 3.1.

**2.1a — Alta de Node dispara `NODE_ASSIGN_WORKER` · P0** `▸ split de 2.1`
- Descripción: `NodeApiService.create` persiste el Node sin despachar evento; la ejecución en el host nunca ocurre.
- Objetivo: crear un Node encola el aprovisionamiento de red.
- Criterios: el alta persiste en `QUEUED` y despacha `NODE_ASSIGN_WORKER`; el job es consumido; queda `dhcp-host=<mac>,<ip>` en el `.conf` del bridge y la NIC del Worker aparece adjunta (`virsh domiflist`).
- Dependencias: ninguna.

**2.1b — Transiciones de estado y evento de fallo del Node · P0** `▸ split de 2.1`
- Descripción: reflejar el ciclo de vida de la asignación.
- Objetivo: el Node transiciona coherentemente y comunica fallos.
- Criterios: `QUEUED → PROVISIONING → ACTIVE` reflejado por WebSocket; en fallo → `FAILED` + `NODE_ASSIGN_WORKER_FAILED`.
- Dependencias: 2.1a.

**2.3a — UI: seleccionar y asignar un Worker a una Zone · P0** `▸ split de 2.3`
- Descripción: no existe formulario para crear/asignar Node.
- Objetivo: asignar un Worker disponible desde el detalle de Zone.
- Criterios: botón "Asignar Worker" abre selector de Workers no asignados; al confirmar llama al alta de Node; la lista se actualiza.
- Dependencias: 2.1a.

**2.3b — UI: IP asignada y estado en vivo de la asignación · P1** `▸ split de 2.3`
- Descripción: feedback de la operación de asignación.
- Objetivo: ver el progreso `QUEUED→ACTIVE` y la IP resultante.
- Criterios: la asignación muestra estado en vivo (vía WebSocket) y la IP asignada; error visible si falla.
- Dependencias: 2.3a, 2.1b, OUX-1.

**4.1 — Decisión de producto: qué es un "Mesh" · P0**
- Descripción: no existe entidad Mesh; `Zone` es una subred única.
- Objetivo: fijar el modelo y vocabulario de red del MVP.
- Criterios: documento de decisión con opción elegida — (A) **Zone == Mesh** (una subred por red; solo alineación de nombres) o (B) Mesh como agrupador de subredes (nueva entidad; se difiere a post-MVP). **Recomendación para MVP: opción A.**
- Dependencias: ninguna.

**OUX-1 — Toda acción crea una "Operación" observable · P0** *(ver §9)*
- Descripción: cada create/start/stop/delete/assign expone una "Operación" con estado actual consultable desde el recurso.
- Objetivo: cumplir el requisito de MVP "el usuario entiende qué está ocurriendo".
- Criterios: el detalle de cada recurso muestra su operación en curso con estado actual, que se actualiza sin refrescar; al terminar muestra Completado o Falló.
- Dependencias: ninguna (aprovecha eventos + WebSocket existentes).

**2.2 — Desasignar Node dispara `NODE_UNASSIGN_WORKER` · P1**
- Criterios: eliminar un Node revierte reserva DHCP y desconecta la NIC; estado coherente.
- Dependencias: 2.1a.

**2.4 — UI: gestionar/desasignar Node · P1**
- Criterios: acción "Desasignar" con confirmación; refleja estado; actualiza la lista.
- Dependencias: 2.2, 2.3a.

**2.5 — Validaciones de asignación · P1**
- Criterios: impedir asignar un Worker ya asignado o IP fuera de rango; errores `409/400` claros; cubierto por tests.
- Dependencias: 2.1a.

**4.2 — Alinear vocabulario Mesh/Zone en UI y API · P1**
- Descripción: aplicar la decisión 4.1 (opción A) al naming visible.
- Criterios: la UI y las rutas usan un vocabulario consistente con el producto (Mesh/Worker/Node); sin cambios de modelo si es opción A.
- Dependencias: 4.1.

**OUX-2 — Vocabulario de estados intermedios por recurso · P1** *(ver §9)*
**OUX-4 — Indicación clara e inequívoca de fallo · P1** *(ver §9)*

---

## 🔵 Release 0.2 — UX

**Meta:** que la observabilidad de operaciones sea **excelente**. Aquí vive el grueso del Epic Operations UX: timeline, progreso, retry/abort, historial, logs amigables, dashboards e información de red. Nada de esto agrega capacidades nuevas de infraestructura; hace que las existentes se sientan un placer.

### Contenido y prioridades

| ID | Título | Prioridad |
|----|--------|-----------|
| OUX-5 | Timeline visual de la operación (pasos) | **P1** |
| OUX-7 | Errores accionables (qué paso, por qué) | **P1** |
| OUX-8 | Botón Retry | **P1** |
| OUX-15 | Sistema visual de estados consistente | **P1** |
| 3.3 | Feedback de estados de error en la UI de Workers | **P1** |
| OUX-3 | Estado en vivo global sin refrescar | **P1** |
| OUX-6 | Barra de progreso / porcentaje | **P2** |
| OUX-9 | Botón Abort / Cancel | **P2** |
| OUX-10 | Historial de operaciones por recurso | **P2** |
| OUX-11 | Feed de actividad global | **P2** |
| OUX-12 | Duración por paso y total | **P2** |
| OUX-13 | Recursos afectados por la operación | **P2** |
| OUX-14 | Logs amigables (lenguaje humano) | **P2** |
| OUX-16 | Estados vacíos, skeletons y confirmaciones destructivas | **P2** |
| OUX-17 | Notificaciones de fin de operación | **P2** |
| 4.4 | Visualizar rangos IP y ocupación de la Zone | **P2** |
| 1.3 | Redirección a login cuando no hay sesión (front) | **P2** |
| 6.2 | Onboarding: seed reproducible y primer usuario/compañía | **P2** |

> El detalle de todas las historias `OUX-*` está en **§9 Epic: Operations UX**.

### Detalle de ítems no-OUX

**3.3 — Feedback de estados de error en la UI de Workers · P1**
- Descripción: el back produce `FAILED`, motivos y reintentos; la UI no los muestra consistentemente. Se apoya en OUX-4/OUX-7.
- Criterios: `FAILED` visible con el motivo del último evento de fallo; acceso a reintentar si aplica.
- Dependencias: OUX-4, OUX-7.

**4.4 — Visualizar rangos IP y ocupación de la Zone · P2**
- Criterios: el detalle de Zone muestra CIDR, gateway, rango DHCP e IPs ocupadas por Nodes.
- Dependencias: 4.2.

**1.3 — Redirección a login cuando no hay sesión (front) · P2**
- Descripción: `middleware.ts` es no-op; mejora de UX (no de seguridad dura).
- Criterios: `/dashboard/**` sin sesión redirige a `/login`.
- Dependencias: ninguna.

**6.2 — Onboarding: seed reproducible y primer usuario/compañía · P2**
- Criterios: seed idempotente documentado; camino claro para el usuario/compañía inicial.
- Dependencias: ninguna.

---

## 🟣 Release 0.3 — Features

**Meta:** aumentar las **capacidades** del producto una vez que el core es sólido y agradable.

| ID | Título | Prioridad | Dependencias |
|----|--------|-----------|--------------|
| 4.3 | UI de Fibers (port-forwarding) | **P2** | Epic 2, OUX-5 |
| 3.2a | Back: aplicar cambios de recursos del Worker (CPU/RAM/disco) | **P2** | 3.1 |
| 3.2b | UI: redimensionar Worker (cambiar flavor/recursos) | **P2** | 3.2a |
| 5.2a | Endpoint `/health` (DB, Redis) | **P2** | — |
| 5.2b | Visibilidad del estado de la cola (jobs pendientes/fallidos) | **P2** | 5.2a |
| — | Monitoreo básico de Worker (uso CPU/RAM) | **P2** | 3.1 |
| — | Almacenamiento: CRUD de discos + attach/detach | **P3** | 3.2a |
| — | Orbit dentro del producto (Portals/Transponders ya construidos) | **P3** | — |

### Detalle

**4.3 — UI de Fibers · P2**
- Descripción: back completo (eventos + nftables), sin UI.
- Criterios: crear/editar/eliminar Fiber desde el detalle de Node; validación de conflicto de puerto (`PortConflictError` existe); estado en vivo con timeline (OUX-5).
- Dependencias: Epic 2, OUX-5.

**3.2a — Back: aplicar cambios de recursos del Worker · P2** `▸ split de 3.2`
- Descripción: la ejecución existe (`editWorkerMemory/Cpus/DiskSpace`) pero `WorkerUpdateProcessor` no la aplica.
- Criterios: `WORKER_UPDATE` con nuevos recursos aplica `virsh setmem/setvcpus` / `qemu-img resize`; no permite reducir disco.
- Dependencias: 3.1.

**3.2b — UI: redimensionar Worker · P2** `▸ split de 3.2`
- Criterios: el usuario cambia flavor/recursos de un Worker existente y ve la operación en timeline.
- Dependencias: 3.2a, OUX-5.

**5.2a / 5.2b — Health checks y visibilidad de la cola · P2** `▸ split de 5.2`
- Criterios: `/health` reporta DB y Redis; panel/endpoint con conteo de eventos `QUEUED/FAILED`.
- Dependencias: 5.2a → 5.2b.

**Monitoreo básico de Worker · P2** *(nuevo, capability)*
- Criterios: el detalle del Worker muestra uso de CPU/RAM (aunque sea muestreo simple).
- Dependencias: 3.1.

**Almacenamiento (CRUD discos + attach/detach) · P3** — capacidad futura.
**Orbit dentro del producto · P3** — ya construido; incorporarlo cuando el core esté maduro (requiere cifrado de `apiKey`, §Hardening).

---

## 🔴 Release 1.0 — Hardening

**Meta:** todo lo que un usuario final **no necesita para probar** el producto, pero sí para operarlo en producción con seguridad y a escala.

| ID | Título | Prioridad | Dependencias |
|----|--------|-----------|--------------|
| 1.1 | Guard de autenticación global en endpoints de infraestructura | **P1** | — |
| 1.2 | Scoping por tenant en lecturas (eliminar IDOR) | **P1** | 1.1 |
| 5.1a | Validación de DTOs — mesh/zone/node/fiber | **P1** | — |
| 5.1b | Validación de DTOs — worker | **P1** | — |
| 5.4a | Definir máquina de estados centralizada de `ResourceStatus` | **P1** | — |
| 1.4a | Modelo de roles (owner/admin/member) | **P2** | 1.1 |
| 1.4b | Enforcement de permisos en operaciones destructivas | **P2** | 1.4a |
| 5.4b | Aplicar máquina de estados a Worker | **P2** | 5.4a |
| 5.4c | Aplicar máquina de estados a Zone/Node | **P2** | 5.4a |
| 5.3 | Logs estructurados con correlación por evento | **P2** | — |
| 5.5 | Idempotencia y compensación en fallos parciales | **P2** | 5.4a |
| 6.1 | Documentación de setup del host | **P2** | — |
| — | Cifrado de secretos en reposo (`apiKey`, credenciales) | **P2** | — |
| — | Rate limiting en auth y creación de recursos | **P2** | 1.1 |
| — | Alta disponibilidad de la cola + dead-letter observable | **P3** | 5.2b |
| — | Multi-host / scheduling (superar punto único de fallo) | **P3** | — |
| — | Auditoría (quién hizo qué, cuándo) | **P3** | 1.4a, 5.3 |

> **Nota de seguridad (importante):** 1.1 y 1.2 viven en Hardening por decisión de producto (el MVP se demuestra en entorno controlado). **Si la demo se expone públicamente, adelantá 1.1 (guard global) a 0.1 — es barato y evita acceso no autenticado a la infraestructura.** No es un bloqueante de función, sí de exposición.

### Detalle (resumen; criterios heredados de la iteración 1)

- **1.1 · P1** — `LoggedInGuard` global (`APP_GUARD`) con opt-out para login; `401` sin token en hive/mesh/orbit; tests.
- **1.2 · P1** — todo acceso filtra por `companyId`; acceso cruzado devuelve `403/404`; tests entre dos compañías.
- **5.1a/5.1b · P1** — `ValidationPipe` global + DTOs con `class-validator` (CIDR, puertos, MAC, claves SSH, nombres); tests de casos límite. Split por dominio de red vs. worker.
- **5.4a · P1** — fuente única de transiciones válidas de `ResourceStatus` (el bug 3.1 nace de la dispersión actual).
- **1.4a/1.4b · P2** — roles + enforcement en operaciones destructivas.
- **5.4b/5.4c · P2** — reutilizar la máquina de estados en Worker y Zone/Node; transiciones inválidas rechazadas y testeadas.
- **5.3 · P2** — logs estructurados con `eventId`/`resourceId` de punta a punta.
- **5.5 · P2** — reintentos idempotentes y saga de compensación coherente con `ResourceStatus`.
- **6.1 · P2** — guía de dependencias del host (libvirt/KVM, dnsmasq, nftables, `guestfish`, `genisoimage`, `nmap`, `ipcalc`, variables de entorno) + modo `Stub*` para dev.

---

# 9. Epic: Operations UX 🌟

> **Este epic es el diferencial del producto.** La tesis: en la mayoría de las plataformas IaaS creás un recurso y esperás a ciegas. Acá, **cada operación se siente como un Job**: el usuario ve los pasos, el progreso, dónde está parado, qué falló y por qué, y puede reintentar o abortar. Esto aplica a **todos** los recursos (Workers, Meshes, Nodes, Fibers, Portals…).
>
> **Solo se describe la experiencia — no la implementación.** El backend ya emite eventos con estados y variantes de fallo, y ya hay WebSocket: la materia prima existe.

## Concepto central: la "Operación"

Toda acción sobre infraestructura (crear, iniciar, detener, actualizar, asignar, eliminar) genera una **Operación** de primera clase, con:
- un **título humano** ("Creando Worker `web-01`"),
- una **secuencia de pasos** con estado individual,
- un **estado global** (En cola · En progreso · Completada · Fallida · Abortada),
- un **resultado** y, si falló, un **motivo claro**,
- **acciones** (Retry / Abort) según corresponda,
- **duración** y **recursos afectados**.

La Operación es visible desde tres lugares: el **recurso** (su detalle), un **feed de actividad global**, y **notificaciones** al terminar.

## Ejemplo de pasos por recurso (vocabulario, OUX-2)

```
Worker:  En cola → Descargando imagen → Creando disco → Generando cloud-init
         → Creando VM → Iniciando VM → Conectando a la red → Completada
Mesh:    En cola → Creando bridge → Configurando DHCP → Aplicando firewall → Completada
Node:    En cola → Reservando IP → Conectando NIC al bridge → Verificando conectividad → Completada
Fiber:   En cola → Validando puerto → Aplicando regla de red → Completada
```

## Historias

> Todas son pequeñas (~1–2 días). Release: 0.1 = fundación mínima en el MVP; 0.2 = experiencia completa.

**OUX-1 — Toda acción crea una "Operación" observable · P0 · Release 0.1**
- Experiencia: al ejecutar cualquier acción, el usuario ve inmediatamente que "algo empezó" y puede seguirlo desde el recurso, sin refrescar. Al terminar, ve Completada o Falló.
- Criterios de aceptación (experiencia):
  - Cada create/start/stop/delete/assign produce una Operación visible en el detalle del recurso.
  - El estado se actualiza en vivo.
  - El estado final es inequívoco (Completada / Fallida).
- Dependencias: ninguna.

**OUX-2 — Vocabulario de estados intermedios por recurso · P1 · Release 0.1**
- Experiencia: los estados no son genéricos ("procesando…"); reflejan el paso real ("Generando cloud-init"). El usuario entiende *qué* está pasando, no solo *que* está pasando.
- Criterios: existe un vocabulario de pasos definido por tipo de recurso (al menos Worker, Mesh, Node); la UI muestra el paso actual con su etiqueta humana.
- Dependencias: OUX-1.

**OUX-3 — Estado en vivo global sin refrescar · P1 · Release 0.2**
- Experiencia: en cualquier listado o dashboard, los estados cambian solos a medida que las operaciones avanzan. Nunca hace falta un F5.
- Criterios: listados de Workers/Zones/Nodes reflejan cambios de estado en tiempo real.
- Dependencias: OUX-1.

**OUX-4 — Indicación clara e inequívoca de fallo · P1 · Release 0.1**
- Experiencia: cuando algo falla, se ve *rojo y claro*, no un estado ambiguo. El usuario sabe al instante que necesita atención.
- Criterios: estado `FAILED` con color/ícono distintivo y un resumen de una línea del motivo; visible en el recurso y en cualquier listado.
- Dependencias: OUX-1.

**OUX-5 — Timeline visual de la operación · P1 · Release 0.2**
- Experiencia: al abrir una operación, el usuario ve una línea de tiempo vertical con cada paso: hechos (check), actual (spinner), pendientes (atenuados), fallido (cruz roja en el paso exacto).
- Criterios: timeline con estado por paso; el paso donde falló queda marcado; se puede abrir desde el recurso y desde el feed.
- Dependencias: OUX-1, OUX-2.

**OUX-6 — Barra de progreso / porcentaje · P2 · Release 0.2**
- Experiencia: una barra o porcentaje comunica "cuánto falta", derivado de los pasos completados vs. totales.
- Criterios: indicador de avance coherente con el timeline; nunca retrocede salvo en reintento.
- Dependencias: OUX-5.

**OUX-7 — Errores accionables · P1 · Release 0.2**
- Experiencia: el error dice *en qué paso* falló, *por qué* en lenguaje entendible, y *qué puede hacer* el usuario (reintentar, revisar datos, contactar soporte).
- Criterios: el detalle de una operación fallida muestra paso + causa + sugerencia; sin stack traces crudos.
- Dependencias: OUX-5, OUX-14.

**OUX-8 — Botón Retry · P1 · Release 0.2**
- Experiencia: ante un fallo recuperable, un botón "Reintentar" bien visible relanza la operación desde un estado seguro.
- Criterios: Retry disponible solo en operaciones fallidas reintentables; al pulsarlo, la operación vuelve a "En progreso" y el timeline se reinicia/continúa.
- Dependencias: OUX-5.

**OUX-9 — Botón Abort / Cancel · P2 · Release 0.2**
- Experiencia: una operación larga o colgada puede abortarse desde la UI, con confirmación, dejando el recurso en un estado consistente.
- Criterios: Abort disponible en operaciones en curso abortables; confirmación; el recurso queda en estado coherente y comunicado.
- Dependencias: OUX-5.

**OUX-10 — Historial de operaciones por recurso · P2 · Release 0.2**
- Experiencia: el detalle de cada recurso tiene una pestaña "Actividad" con todas sus operaciones pasadas, su resultado y cuándo ocurrieron.
- Criterios: lista cronológica por recurso con estado final, fecha y acceso al timeline de cada una.
- Dependencias: OUX-1.

**OUX-11 — Feed de actividad global · P2 · Release 0.2**
- Experiencia: una vista central ("Actividad") muestra todo lo que está pasando y pasó en la infraestructura del usuario, filtrable por recurso/estado.
- Criterios: feed con operaciones en curso y recientes; filtros por tipo de recurso y estado; enlaces al recurso y al timeline.
- Dependencias: OUX-1.

**OUX-12 — Duración por paso y total · P2 · Release 0.2**
- Experiencia: el usuario ve cuánto tardó cada paso y la operación completa (útil para entender lentitudes).
- Criterios: el timeline muestra duración por paso y total; formato humano ("1m 12s").
- Dependencias: OUX-5.

**OUX-13 — Recursos afectados por la operación · P2 · Release 0.2**
- Experiencia: una operación muestra qué recursos toca (ej. asignar Node afecta al Worker y a la Zone), con enlaces navegables.
- Criterios: sección "Recursos afectados" con enlaces; refleja los `EventResource` (primary/parent/related).
- Dependencias: OUX-5.

**OUX-14 — Logs amigables · P2 · Release 0.2**
- Experiencia: si el usuario quiere ver el detalle, encuentra un log legible ("La imagen se descargó (312 MB)") en vez de salida cruda de `virsh`/`nft`.
- Criterios: los mensajes por paso están en lenguaje humano; el detalle técnico crudo queda opcional/colapsado.
- Dependencias: OUX-5.

**OUX-15 — Sistema visual de estados consistente · P1 · Release 0.2**
- Experiencia: los mismos colores, íconos y etiquetas para cada estado en toda la app (un `FAILED` se ve igual en un Worker, un Node o un Fiber).
- Criterios: guía visual de estados aplicada de forma consistente a todos los recursos y listados.
- Dependencias: OUX-4.

**OUX-16 — Estados vacíos, skeletons y confirmaciones destructivas · P2 · Release 0.2**
- Experiencia: nunca hay una pantalla en blanco confusa; los vacíos guían la siguiente acción; las cargas usan skeletons; borrar algo pide confirmación clara.
- Criterios: empty states con call-to-action; skeletons en cargas; confirmación en eliminar Worker/Zone/Node.
- Dependencias: ninguna.

**OUX-17 — Notificaciones de fin de operación · P2 · Release 0.2**
- Experiencia: si el usuario navegó a otra parte, recibe un aviso ("Worker `web-01` creado" / "Falló la asignación de Node") sin tener que quedarse mirando.
- Criterios: notificación (toast/centro) al completarse o fallar una operación, con enlace al recurso.
- Dependencias: OUX-1.

---

# 10. Riesgos

| # | Riesgo | Impacto | Release donde se mitiga |
|---|--------|---------|-------------------------|
| R2 | **Flujo Node roto** → el MVP no cumple su objetivo central | Alto | **0.1** (2.1a/2.1b/2.3) |
| R3 | **Creación de Worker inconsistente** | Alto | **0.1** (3.1) |
| R10 | **Imagen base inválida** → no arranca ninguna VM | Alto | **0.1** (6.3) |
| R6 | Desajuste conceptual Mesh/Zone genera retrabajo si se decide tarde | Medio | **0.1** (4.1) |
| R1 | Endpoints sin auth expuestos si la demo es pública | Crítico *si se expone* | **1.0** (1.1) — *adelantar a 0.1 si hay exposición* |
| R4 | Ejecución con `sudo` de comandos con datos de usuario (superficie RCE) | Crítico | **1.0** (5.1) — auditar todas las rutas |
| R5 | Fallos parciales dejan recursos huérfanos (VM sin red, DHCP sin VM) | Medio | **1.0** (5.4/5.5) |
| R7 | Punto único de fallo: cloud-scripts en un host | Medio | **0.3** salud (5.2) · **1.0** multi-host |
| R8 | Secretos en claro (`apiKey`) en DB | Medio | **1.0** (cifrado) |
| R9 | Sin rate limiting en auth/creación | Medio | **1.0** |

---

# 11. Visión del Producto

> Esta sección describe **cómo debe sentirse** usar Marppa Cloud Solution. No habla de arquitectura ni de código. Es la brújula de todas las decisiones de UX: ante cualquier duda de diseño, se decide por lo que acerque la experiencia a esta visión.

## La promesa

**"Nunca vas a mirar tu infraestructura y preguntarte qué está pasando."**

Las plataformas de infraestructura suelen tratar el aprovisionamiento como una caja negra: pedís una VM, aparece un spinner, y minutos después tenés algo (o un error genérico). MCS invierte eso. Acá, **la infraestructura es transparente**: cada cosa que ocurre es visible, explicada y recuperable. Crear infraestructura se siente menos como rezar y más como ver una receta ejecutarse paso a paso.

## El primer minuto

Un usuario entra, se loguea y llega a un **dashboard tranquilo y legible**. No hay un muro de opciones. Ve sus tres pilares —**Meshes** (redes), **Workers** (VMs) y cómo se conectan— y un **feed de actividad** que le cuenta, en lenguaje humano, qué pasó recientemente. Si está vacío, la pantalla no lo deja perdido: lo invita a crear su primera red o su primera VM con un camino claro.

## Crear un recurso

Cuando crea un **Mesh**, el formulario es corto y honesto: un nombre, un rango de red. Al confirmar, **no aparece un spinner anónimo**. Aparece una **Operación**: "Creando red `prod-net`", con sus pasos desplegándose —creando el bridge, configurando DHCP, aplicando reglas de firewall— cada uno pasando de pendiente a en progreso a hecho, con un check verde. En segundos, "Completada". El usuario *entendió* lo que la plataforma hizo por él.

Crear un **Worker** se siente igual, pero más rico, porque hay más pasos: descargar la imagen, crear el disco, generar la configuración inicial, definir la VM, iniciarla. La barra de progreso avanza. Si descargar la imagen tarda, el usuario lo *ve* —"Descargando imagen (312 MB)"— y no se pregunta si se colgó. Al final, se le entregan sus **credenciales SSH una sola vez**, con una advertencia clara de guardarlas.

## Conectar una VM a una red

Este es el momento donde otras plataformas confunden. Acá es un gesto simple: desde una red, "Asignar Worker", elige uno de la lista de disponibles, confirma. La Operación muestra los pasos que importan —reservando la IP, conectando la tarjeta de red al bridge, verificando conectividad— y al terminar, **le dice qué IP le tocó**. La relación entre la VM y la red deja de ser un concepto abstracto: es algo que el usuario vio suceder.

## Observar el estado

En cualquier momento, el usuario puede abrir la vista de **Actividad** y ver *todo*: lo que está corriendo ahora y lo que pasó antes, filtrable por recurso o por estado. Cada operación es clickeable y revela su **timeline**: los pasos, cuánto tardó cada uno, qué recursos tocó. Los estados son **consistentes en toda la app** —un fallo se ve igual de rojo en un Worker, un Node o un Fiber—, así que el usuario aprende el lenguaje visual una vez y lo reconoce en todos lados. Nada requiere refrescar: los listados cambian solos.

## Entender un error

Cuando algo falla —y algo siempre falla— la experiencia **no castiga al usuario**. No hay un stack trace ni un "Error 500". Hay una operación marcada en rojo, con el **paso exacto** donde se rompió ("Falló en: Conectando a la red"), una **causa en lenguaje humano** ("La IP solicitada ya estaba en uso"), y una **sugerencia**. El usuario sabe qué pasó y qué puede hacer, sin ser ingeniero de redes.

## Recuperarse de un fallo

Junto al error hay un botón **Reintentar**. Un clic, y la operación vuelve a correr desde un punto seguro; el timeline se reanima. Si una operación quedó colgada, hay **Abortar**, con confirmación, y el recurso queda en un estado limpio y explícito —nunca en un limbo silencioso. La plataforma trata los fallos como parte normal del trabajo, no como una excepción vergonzosa.

## Administrar la infraestructura en el tiempo

A medida que crece, el usuario administra desde vistas claras: sus redes con su ocupación de IPs visible, sus VMs con su estado real, las conexiones entre ellas. Cada recurso tiene su **historial de actividad** —una bitácora legible de todo lo que le pasó—. Las operaciones destructivas piden confirmación. Nada desaparece sin dejar rastro; nada cambia sin que el usuario lo pueda ver.

## El sentimiento final

Al terminar una sesión, el usuario debería sentir **control y confianza**: entendió cada cosa que hizo, vio cada cosa que la plataforma hizo por él, y en ningún momento tuvo que adivinar. Si algo salió mal, supo por qué y cómo arreglarlo. Esa sensación —**"esto es transparente, esto no me miente, esto me deja ver"**— es el producto. Las VMs y las redes son la mesa de entrada; **la observabilidad de las operaciones es el plato principal.**

> **Principio rector para el equipo:** ante cualquier decisión de UX, preguntarse: *"¿Esto ayuda al usuario a entender qué está pasando, qué falta, si falló, por qué, y cómo recuperarse?"* Si la respuesta es sí, va en la dirección del producto.

---

## Anexo — Notas de verificación (iteración 1, trazabilidad)

Hallazgos confirmados por lectura de código en la iteración 1 (no ejecutados en runtime salvo indicación):
- **Sin guard global:** `app.module.ts` solo aplica `AuthMiddleware` (que no rechaza); `LoggedInGuard` solo en auth/company/user.
- **Node sin evento:** `NodeApiService.create` no inyecta `EventDispatchService`; `NodeService.create` persiste `ACTIVE`. Procesadores existen en cloud-scripts, nadie los encola por esta vía.
- **Worker `PROVISIONING` vs `QUEUED`:** `WorkerService.createWorker` usa `PROVISIONING`; `status` es campo plano que sobrevive a `PrismaMapper.toCreate`; `WorkerCreateProcessor` aborta si `!= QUEUED`. **Confirmar en runtime.**
- **UI de Node ausente:** consumidores de `use-node`/`node.api` se limitan a `NodesList` (solo lectura).
- **No existe entidad Mesh:** `schema.prisma` no define `Mesh`; `Zone` tiene `cidr`+`gateway` (una subred).
- **Imagen seed:** `apps/back/prisma/seed.ts` define `ubuntu-24.04` con URL de ISO 22.04 y `virtualizationType: 'iso'`, inconsistente con cloud images en `LinuxHiveService`.
