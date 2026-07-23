# Gaps para el flujo end-to-end (backend + cloud-scripts)

Análisis de lo que le falta a la app para reproducir, de punta a punta, el flujo del
runbook `libvirt-vmnet-runbook.md`:

1. crear subred (Zone) + DHCP
2. crear VM (Worker) con cloud-init
3. asignar VM a subred (Node ← Worker)
4. levantar la VM y hacerla accesible desde una PC externa

Cada tarea arranca con `[○]`; al completarla, cambiala por `[✓]`.
Foco: **backend** (`apps/back`) y **cloud-scripts** (`apps/cloud-scripts`).
Frontend / integración Windows quedan para después.

Mapeo de conceptos: **Zone** = subred/red virtual (bridge + dnsmasq + nftables),
**Node** = IP reservada dentro de una Zone, **Worker/Hive** = VM, **Fiber** = port-forward
(DNAT) para exponer un Node hacia afuera.

> **Nota — generación de IDs: OK, no es un gap.** `PrismaService` (`apps/back/.../prisma.service.ts`)
> tiene un middleware `$extends` sobre `create` que llama `processIds`, el cual asigna `id`
> con prefijo corto por modelo (`z-`, `w-`, `n-`, …) usando `Utils.generateUUID(prefix, 6)`.
> Da `z-` + 6 hex = 8 chars (charset `abcdef0-9`): nombre de interfaz Linux válido y bajo el
> límite de 15. `PrismaMapper.toCreate` deja el PK en `undefined`, lo que dispara la generación.
> Funciona; no requiere acción.

---

## Bloqueantes (rompen el flujo)

### 1. Generalizar los estados: estado inicial que setea el backend ↔ estado que espera cada processor

**Este es el punto central a resolver.** Hoy cada `ApiService` del backend persiste un estado al
despachar el evento, y cada processor de cloud-scripts valida un estado de entrada — pero **no hay
una convención unificada** y varios no coinciden, cortando el flujo. Hay que definir y aplicar una
**máquina de estados canónica y general** para todos los recursos/eventos.

- [✓] **Definir la convención de estados de forma general (no ad-hoc por recurso).**
  Fuente de verdad única en `packages/api-types/src/event-state-machine.ts`:
  `EVENT_STATE_MACHINE: Record<EventTypeKey, { entry, work, ok, fail }>` + helper
  `getEventStateTransition(type)`.
  - **Backend** consume `.entry` en los domain services (`zone/worker/node/fiber.service`,
    incl. `worker.startWorker`) — nada de literales `QUEUED` sueltos en el happy-path.
  - **Cloud-scripts** consume vía adapter `@/shared/domain/EventStateMachine` (`getEventStates`,
    que castea los enums gemelos api-types↔db en un solo lugar). Los 5 processors del happy-path
    (`ZoneCreate`, `WorkerCreate`, `WorkerStart`, `NodeAssignWorker`, `NodeCreateFiber`) validan
    `STATES.entry`, pasan a `STATES.work`, terminan en `STATES.ok`, y en error re-setean
    `STATES.entry`/`STATES.fail`.
  - Filas del happy-path verificadas contra los processors; el resto (update/delete/terminate/
    unassign/fiber-update) quedan en el mapa siguiendo la convención pero **pendientes de
    confirmar** al cablearlas (ver ítem de auditoría más abajo).

> **Convención adoptada (regla única):** *todo evento de infra despachado deja el recurso
> primary en `QUEUED`; el processor valida `QUEUED`, pasa a `PROVISIONING` y termina en el
> estado terminal (`ACTIVE`/`INACTIVE`/`DELETED`/`FAILED`).* La precondición de negocio del
> estado estable previo (p. ej. "sólo se puede iniciar un worker `INACTIVE`") la valida el
> **backend** antes de setear `QUEUED` (ya lo hace con `WorkerInvalidStatusError`). Esto es
> consistente con el path de retry, que ya re-setea `QUEUED`.

- [✓] **Corregir los desalineamientos concretos del happy-path (Zone → Worker → Assign → Start → Fiber).**
  - **Zone create:** `ZoneService.create` ahora persiste `QUEUED` (antes `ACTIVE`).
  - **Worker create:** `WorkerService.createWorker` ahora persiste `QUEUED` (antes `PROVISIONING`).
  - **Worker start:** `WorkerStartProcessor` ahora valida `QUEUED` (antes `INACTIVE`); el backend
    ya seteaba `QUEUED`. Mock del test `critical-high.test.ts` actualizado a `QUEUED`.
  - **Node create:** `NodeService.create` ahora persiste `QUEUED` (antes `ACTIVE`), precondición
    que espera `NodeAssignWorkerProcessor`.
  - **Fiber create:** `FiberService.create` ahora persiste `QUEUED` (antes `ACTIVE`).

- [○] **Auditar el resto de transiciones (update, delete, terminate, unassign, fiber-update) — NO bloqueante.**
  Aplicar la misma convención a estos processors/servicios (varios validan estados estables y su
  path de retry ya setea `QUEUED`, así que fallan en el primer reintento). `delete`/`terminate`
  además requieren decidir **soft-delete** (el processor necesita leer el recurso — cidr/bridge —
  para el teardown; hoy el repo hace hard-delete). Fuera del happy-path del MVP.

### 2. Asignar Worker a Node/Zone — trigger desde el backend

- [✓] **Despachar `NODE_ASSIGN_WORKER` al crear un Node para un Worker.**
  Un `Node` ya se crea con `workerId` (está en `CreateNodeDto` y en `Node.workerId @unique`):
  representa la presencia de un Worker en una Zone. `NodeApiService.create` ahora, cuando hay
  `workerId`, despacha `NODE_ASSIGN_WORKER` con `primary: Node` + `related: Worker`
  (el processor `NodeAssignWorkerProcessor` hace `addNodeToZone` = reserva DHCP `mac→ip`, y
  `editWorkerZone` = adjunta la NIC bridged). Sin endpoint nuevo: el disparo es la creación del node.
  `CreateNodeDto` se relajó a `workerId?`/`atomId?` opcionales (el XOR lo valida `NodeService.create`).

- [○] **Des-asignar: despachar `NODE_UNASSIGN_WORKER` — NO bloqueante para el MVP.**
  El processor `NodeUnassignWorkerProcessor` existe pero no se despacha. Necesario para
  mover/liberar workers de una zona (post-MVP).

---

## Setup del host — verificar en SYSTEM_RESET

Los prerequisitos del host (runbook §1, §5) que la app da por hechos deben **verificarse al inicio
de `SystemResetProcessor`** (`apps/cloud-scripts/.../system/application/SystemResetProcessor.ts`),
antes de `forceResetHive/Mesh/Orbit`. Si alguno no se cumple, **crashear con un error descriptivo**
(qué falta y cómo remediarlo), no seguir en un estado inconsistente.

- [✓] **Preflight de prerequisitos en `SYSTEM_RESET` que crashea con error claro si falta algo:**
  Implementado en `SystemResetProcessor.preflight()` (corre antes de `forceResetHive/Mesh/Orbit`).
  Acumula problemas y tira un `Error` descriptivo si hay alguno.
  - **IP forwarding**: `net.ipv4.ip_forward=1` (runbook §5.1). Ningún código lo setea hoy;
    verificar `/proc/sys/net/ipv4/ip_forward` y fallar descriptivamente si es `0`.
  - **Ruleset base de nftables**: las tablas/chains que la app asume existentes
    (`inet filter {input,forward}`, `ip nat {prerouting,postrouting}`) — `createNftablesConfig`
    y `addFiber` hacen `nft add rule` sobre ellas sin crearlas. Verificar que existan
    (o el archivo de `NFTABLES_RESET_SOURCE`) y fallar si no.
  - **Binarios de sistema requeridos**: `nmap`, `ipcalc`, `nft`, `dnsmasq`, `virsh`,
    `virt-install`, `genisoimage`, `guestfish` (libguestfs), `qemu-img`, `wget`, `ping`, `arp`.
    Verificar presencia y fallar listando los faltantes.
  - **Env vars requeridas**: `BRIDGE_NAME` (uplink LAN, usado como `externalInterface`),
    `USERNAME`, `MIN_PORT`/`MAX_PORT`, `NFTABLES_RESET_SOURCE`, `ALLOWED_IMAGE_DOMAINS`.
    Validar presencia/formato y fallar descriptivamente.

- [✓] **Agregar `NFTABLES_RESET_SOURCE` a `.env.template`** (lo usa `forceResetMesh` pero no figuraba).

---

## Acceso externo — adoptar el modelo del runbook (no NAT hacia RFC1918)

El runbook (§4.2, §5.2, §8) es la referencia correcta: `forward mode=open`, y el host **no
masquera** el tráfico VM→destinos privados (LAN física + otras zonas), sólo masquera lo que va a
Internet. Así la respuesta de la VM conserva el source `10.10.x.y` y el cliente (con ruta estática
`10.10.0.0/16 → host`) la acepta. Es el enfoque que mejor escala: una sola ruta cubre todas las
zonas presentes y futuras, sin abrir un puerto por servicio.

- [✓] **Agregar excepciones `return` para RFC1918 antes del `masquerade` en `createNftablesConfig`.**
  `createNftablesConfig` ahora inserta, por cada `10.0.0.0/8`/`172.16.0.0/12`/`192.168.0.0/16`,
  una regla `postrouting oifname <ext> ip saddr <cidr> ip daddr <rfc1918> return` antes del
  `masquerade` (sólo Internet cae al masquerade). `deleteNftablesConfig` baja también esas `return`.
  Hoy `LinuxMeshService.createNftablesConfig` agrega `ip saddr <cidr> ... masquerade` sobre
  `oifname <externalInterface>` sin excepción, lo que reescribe el source del tráfico VM→LAN física
  y rompe el retorno hacia el cliente (justo lo que advierte el runbook §5.2). Insertar, antes del
  `masquerade`, reglas que hagan `return` para destinos `10.0.0.0/8`, `172.16.0.0/12`,
  `192.168.0.0/16`; sólo el tráfico realmente hacia Internet cae al `masquerade`. Replicar la baja
  correspondiente en `deleteNftablesConfig`.
  (Los Fibers/DNAT siguen disponibles para exponer puertos puntuales; este cambio habilita además
  el acceso por ruteo directo del runbook.)

---

## Robustez del cloud-init — IP estática según el runbook

El runbook §6.3 es la referencia correcta: con `mode=open` + NoCloud, el DHCP en el primer boot es
frágil (puede colgar en `systemd-networkd-wait-online`), y recomienda **IP estática** en el
`network-config`. La cantidad de lógica de diagnóstico/reintento en `WorkerStartProcessor` confirma
que esa fragilidad ya se sufre. Pasar a estática es lo más robusto y escalable.

- [✓] **Generar el `network-config` del cloud-init con IP estática (no `dhcp4: true`).**
  `LinuxHiveService.buildNetworkConfig(mac, net?)` genera estática cuando hay `net`
  (`addresses: [<ip>/prefix]`, `routes: default via <gateway>`, `nameservers: [<gateway>, 1.1.1.1]`,
  `dhcp4: false`), con fallback DHCP cuando aún no hay IP. Se corrigió también la indentación
  YAML (antes `version/renderer/ethernets` colgaban a nivel raíz).

- [✓] **Rearmar el seed ISO en la asignación (`NODE_ASSIGN_WORKER`), que es cuando se conoce la IP.**
  Nuevo `HiveService.rearmCloudInitISO(id, name, mac, net)`: reusa el `user-data` escrito en
  `WORKER_CREATE`, reescribe `meta-data`+`network-config` estáticos y regenera la ISO en el mismo
  path. `NodeAssignWorkerProcessor` lo llama con `node.ipAddress` + `zone.gateway` + prefix
  (de `zone.cidr`) antes de `addNodeToZone`/`editWorkerZone`.

- [✓] **Versionar el `instance-id` al rearmar la ISO.**
  `meta-data` ahora usa `instance-id: ${name}-${Date.now()}` en cada (re)generación (`writeSeedIso`),
  así cloud-init re-aplica la config de red en el próximo boot.

- [✓] **Resolver la dependencia de Internet en el primer boot (golden image).**
  `LinuxHiveService.prepareBaseImage()` hornea los paquetes (`BASE_IMAGE_PACKAGES`) en la imagen
  base con `virt-customize --update --install ... --run-command 'systemctl enable ssh/nginx'`,
  una sola vez (marker `<img>.prepared`), invocado desde `ensureWorkerImageExists`. El `user-data`
  ya **no** trae `package_update/upgrade` ni la lista `packages:`, así que el primer boot no corre
  `apt` ni depende de Internet (sólo se necesita Internet al preparar la imagen). `virt-customize`
  agregado a los binarios del preflight.
  El `user-data` deja `package_update/upgrade: true` e instala nginx/git/etc.; eso requiere Internet
  en el primer arranque (masquerade + DNS + IP forwarding OK). Preferir **preinstalar** los paquetes
  en la imagen base para no depender de red en el primer boot, o garantizar explícitamente ese camino.

---

## Verificación end-to-end

> **Estado 2026-07-18:** typecheck + build limpios en `back` y `cloud-scripts`; tests
> 222/222 (back) y 4/4 (cloud-scripts) en verde. Se creó la migración
> `20260718231004_add_event_resource_role` (columna `EventResource.role` + enums
> `*_FAILED` de `EventType`) que faltaba en la DB. Queda sólo la prueba de humo en host real.

- [○] **Prueba de humo completa (con `USE_STUBS=false`) del flujo: Zone → Worker → Assign → Start → acceso.**
  Encadenar todos los pasos contra un host real y validar: bridge arriba, reserva DHCP aplicada,
  VM toma la IP estática/reservada, cloud-init completa, y la VM queda accesible por ruteo directo
  (ruta estática en el cliente). Hoy no hay evidencia de que el flujo completo se haya corrido de
  punta a punta.
