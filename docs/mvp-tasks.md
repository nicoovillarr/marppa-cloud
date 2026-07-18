# MVP — Checklist de ejecución (Release 0.1 + 0.2)

> Tareas ordenadas por dependencia dentro de cada épica: primero las fundacionales.

---

# Épica: Mesh

## [ ] Decidir el modelo de Mesh como equivalente a una subred (Zone)

**Descripción**

Fijar que un Mesh == una Zone (un `cidr` + `gateway`) y dejar registrada la decisión.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Alinear el vocabulario Mesh en los tipos compartidos

**Descripción**

Actualizar `api-types` para usar el nombre Mesh de forma consistente.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Alinear el vocabulario Mesh en las rutas de la API

**Descripción**

Exponer las operaciones de red bajo el nombre Mesh (o alias sobre Zone).

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Alinear el vocabulario Mesh en la UI

**Descripción**

Renombrar labels, navegación y breadcrumbs de Zone a Mesh.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Mostrar CIDR y gateway en el detalle de Mesh

**Descripción**

Agregar los datos de red básicos a la vista de detalle.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Mostrar el rango DHCP en el detalle de Mesh

**Descripción**

Mostrar el rango de direcciones que reparte la red.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Listar las IPs ocupadas por Nodes en el detalle de Mesh

**Descripción**

Mostrar qué IPs del rango están asignadas y a qué Worker.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Indicar visualmente IPs libres y ocupadas

**Descripción**

Diferenciar de un vistazo las direcciones disponibles de las usadas.

**Estado**

- [x] Pendiente
- [ ] Completada

---

# Épica: Workers

## [ ] Crear el Worker en estado QUEUED

**Descripción**

Cambiar el estado inicial de la creación de `PROVISIONING` a `QUEUED`.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Verificar la transición PROVISIONING → INACTIVE en el procesador

**Descripción**

Confirmar que el procesador toma el Worker en `QUEUED` y completa el flujo.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Agregar test de integración de creación de Worker con StubHiveService

**Descripción**

Cubrir el flujo completo de creación sin depender de un host real.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Reemplazar la imagen seed por una cloud image qcow2 válida

**Descripción**

Cambiar la URL de la imagen por defecto por una cloud image compatible con `virt-install --import`.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Corregir nombre, versión y tipo del registro de imagen seed

**Descripción**

Dejar coherentes los metadatos de la imagen con la cloud image real.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Verificar el arranque de una VM con la nueva imagen

**Descripción**

Probar end-to-end que un Worker creado arranca correctamente.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Generar y entregar las credenciales SSH al crear el Worker

**Descripción**

Confirmar que la clave privada se muestra una sola vez con aviso de guardado.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Mostrar el motivo de fallo en el detalle del Worker

**Descripción**

Exponer el motivo del último evento de fallo cuando el Worker queda en `FAILED`.

**Estado**

- [x] Pendiente
- [ ] Completada

---

# Épica: Nodes (conectar Worker ↔ Mesh)

## [ ] Inyectar EventDispatchService en NodeApiService

**Descripción**

Habilitar el despacho de eventos desde el alta de Node.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Persistir el Node en estado QUEUED al crearlo

**Descripción**

Cambiar el estado inicial del Node de `ACTIVE` a `QUEUED`.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Despachar el evento NODE_ASSIGN_WORKER al crear un Node

**Descripción**

Encolar el aprovisionamiento de red al asignar un Worker a una Mesh.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Reflejar las transiciones QUEUED → PROVISIONING → ACTIVE del Node

**Descripción**

Actualizar el estado del Node según avanza el procesamiento.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Emitir NODE_ASSIGN_WORKER_FAILED y marcar FAILED ante error

**Descripción**

Comunicar el fallo de asignación con el estado y evento correspondientes.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Verificar la reserva DHCP y la NIC adjunta tras asignar

**Descripción**

Confirmar que aparece la reserva `dhcp-host` y la interfaz conectada al bridge.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Despachar NODE_UNASSIGN_WORKER al eliminar un Node

**Descripción**

Encolar la reversión de red al desasignar.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Verificar la reversión de DHCP y la desconexión de la NIC

**Descripción**

Confirmar que se elimina la reserva y se desconecta la interfaz.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Validar que un Worker ya asignado no pueda reasignarse

**Descripción**

Rechazar la asignación si el Worker ya tiene un Node.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Validar que la IP asignada esté dentro del rango de la Mesh

**Descripción**

Impedir asignaciones fuera del rango DHCP de la red.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Devolver errores claros ante asignaciones inválidas

**Descripción**

Responder `409/400` con mensajes entendibles en los casos inválidos.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Agregar tests de asignación y desasignación de Node

**Descripción**

Cubrir los caminos feliz e inválido del flujo de Node.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Agregar el botón "Asignar Worker" en el detalle de Mesh

**Descripción**

Punto de entrada de la asignación desde la red.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Crear el selector de Workers no asignados

**Descripción**

Listar los Workers disponibles para asignar a la Mesh.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Llamar al alta de Node desde la UI de asignación

**Descripción**

Conectar el selector con el endpoint de creación de Node.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Actualizar la lista de Nodes tras asignar

**Descripción**

Refrescar la tabla de Nodes al completar la asignación.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Mostrar la IP asignada al Worker

**Descripción**

Exponer la dirección resultante de la asignación.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Mostrar el estado en vivo de la asignación

**Descripción**

Reflejar el progreso de la asignación vía WebSocket sin refrescar.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Mostrar el error si la asignación falla

**Descripción**

Indicar claramente el fallo de asignación en la UI.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Agregar la acción "Desasignar" con confirmación

**Descripción**

Permitir revertir la relación Worker ↔ Mesh desde la lista de Nodes.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Actualizar la lista de Nodes tras desasignar

**Descripción**

Refrescar la tabla al completar la desasignación.

**Estado**

- [x] Pendiente
- [ ] Completada

---

# Épica: Operations UX

## [ ] Exponer la operación en curso de cada recurso al front

**Descripción**

Hacer consultable el estado de la operación actual desde el recurso.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Mostrar la operación en curso en el detalle de cada recurso

**Descripción**

Reflejar que una acción está en progreso al abrir el recurso.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Actualizar el estado de la operación en vivo sin refrescar

**Descripción**

Empujar cambios de estado por WebSocket mientras la operación avanza.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Mostrar el estado final Completada o Fallida de la operación

**Descripción**

Cerrar la operación con un resultado inequívoco.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Definir el vocabulario de pasos del Worker

**Descripción**

Listar los pasos con etiqueta humana (descargar imagen, crear disco, cloud-init, etc.).

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Definir el vocabulario de pasos del Mesh

**Descripción**

Listar los pasos de creación de red (bridge, DHCP, firewall).

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Definir el vocabulario de pasos del Node

**Descripción**

Listar los pasos de asignación (reservar IP, conectar NIC, verificar conectividad).

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Mostrar el paso actual con su etiqueta humana

**Descripción**

Reflejar en la UI el paso concreto en curso, no un genérico "procesando".

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Estilar el estado FAILED con color e ícono distintivos

**Descripción**

Que un fallo se vea claramente diferenciado.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Mostrar un resumen de una línea del motivo de fallo

**Descripción**

Acompañar el estado fallido con la causa resumida.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Crear la guía visual de estados

**Descripción**

Definir colores, íconos y etiquetas por estado de recurso.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Aplicar la guía visual de estados en todos los listados y recursos

**Descripción**

Usar el mismo lenguaje visual para Workers, Meshes, Nodes y Fibers.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Reflejar cambios de estado en vivo en los listados

**Descripción**

Actualizar las tablas de recursos sin necesidad de refrescar.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Crear el componente de timeline vertical de operación

**Descripción**

Mostrar los pasos de una operación en una línea de tiempo.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Marcar en el timeline pasos hechos, actual, pendientes y fallido

**Descripción**

Distinguir visualmente el estado de cada paso.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Abrir el timeline desde el recurso y desde el feed

**Descripción**

Permitir acceder al detalle de la operación desde ambos lugares.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Agregar barra de progreso derivada de los pasos completados

**Descripción**

Comunicar cuánto falta según pasos hechos vs. totales.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Mostrar el paso donde falló y la causa en lenguaje humano

**Descripción**

Indicar el punto exacto del fallo y su motivo entendible.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Mostrar una sugerencia de acción ante el error

**Descripción**

Orientar al usuario sobre qué puede hacer para resolverlo.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Agregar el botón Reintentar en operaciones fallidas

**Descripción**

Permitir relanzar una operación fallida reintentable.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Relanzar la operación y reanimar el timeline al reintentar

**Descripción**

Volver la operación a "En progreso" y continuar los pasos.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Agregar el botón Abortar con confirmación

**Descripción**

Permitir cancelar una operación en curso.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Dejar el recurso en estado coherente tras abortar

**Descripción**

Garantizar que el recurso no quede en un estado ambiguo.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Agregar la pestaña "Actividad" con el historial por recurso

**Descripción**

Listar cronológicamente las operaciones pasadas de un recurso.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Crear la vista global "Actividad"

**Descripción**

Mostrar las operaciones en curso y recientes de toda la infraestructura.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Agregar filtros por recurso y estado en el feed global

**Descripción**

Permitir acotar la vista de actividad.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Mostrar la duración de cada paso en el timeline

**Descripción**

Exponer cuánto tardó cada etapa.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Mostrar la duración total de la operación

**Descripción**

Exponer el tiempo total en formato humano.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Agregar la sección "Recursos afectados" con enlaces

**Descripción**

Listar los recursos que toca la operación y enlazarlos.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Traducir los mensajes por paso a lenguaje humano

**Descripción**

Reemplazar la salida técnica cruda por mensajes legibles.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Colapsar el detalle técnico crudo

**Descripción**

Mantener el log técnico disponible pero oculto por defecto.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Agregar estados vacíos con call-to-action

**Descripción**

Guiar la siguiente acción cuando no hay recursos.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Agregar skeletons en las cargas

**Descripción**

Mostrar placeholders mientras se cargan los datos.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Agregar confirmación al eliminar Worker, Mesh o Node

**Descripción**

Pedir confirmación explícita en operaciones destructivas.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Mostrar una notificación al completar o fallar una operación

**Descripción**

Avisar al usuario aunque haya navegado a otra parte.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Enlazar al recurso desde la notificación

**Descripción**

Permitir ir directo al recurso desde el aviso.

**Estado**

- [x] Pendiente
- [ ] Completada

---

# Épica: Plataforma

## [ ] Redirigir a login al acceder a /dashboard sin sesión

**Descripción**

Proteger las rutas del dashboard en el front.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Hacer el seed idempotente

**Descripción**

Garantizar que ejecutar el seed varias veces no duplique datos.

**Estado**

- [x] Pendiente
- [ ] Completada

## [ ] Crear la compañía y el usuario inicial en el seed

**Descripción**

Dejar un punto de entrada listo para el primer uso.

**Estado**

- [x] Pendiente
- [ ] Completada
