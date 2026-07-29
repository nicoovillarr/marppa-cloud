# Administrar claves SSH de un worker

**Estado:** implementado el 2026-07-25, **sin probar contra una VM real**. Lo que sigue
describe el diseño y lo que quedó afuera.

Implementado: tabla `WorkerSshKey`, endpoints `GET/POST/DELETE
/hive/workers/:id/ssh-keys`, evento `WORKER_UPDATE_SSH_KEYS` con su processor, y la
sección de claves en el diálogo de administración del worker.

El processor elige el camino según el estado de la VM: **encendida** escribe por el
guest agent, **apagada** escribe directo en el disco con `virt-customize`. Si la VM está
encendida pero el agente no responde, falla y pide apagarla — editar el disco de una VM
corriendo corrompe el filesystem.

## La necesidad

Poder agregar, rotar y quitar claves públicas de un worker desde la UI **en cualquier
momento**, incluso con la VM ya iniciada. Hoy solo se puede al crearla.

## Cómo funciona hoy

1. `CreateWorkerForm.tsx:177` genera un par RSA 2048 **en el navegador** con node-forge.
2. La privada se muestra una sola vez para descargar; nunca sale del cliente.
3. La pública viaja al back como `publicSSH`, que la despacha como propiedad
   `PublicSSH` del evento `WORKER_CREATE`.
4. `WorkerCreateProcessor` la lee y `LinuxHiveService` la escribe en el
   `ssh_authorized_keys` del cloud-init.

**Cloud-init corre solo en el primer boot.** Después de eso nada vuelve a tocar
`authorized_keys`.

## Restricción que hay que resolver primero

**La clave pública no se persiste en ninguna parte.** No hay campo `ssh` en el schema —
ni en `Worker` ni en ningún otro modelo. Viaja como propiedad transitoria del evento y
se pierde.

Para administrar claves hace falta una fuente de verdad: un campo en `Worker` o, mejor,
una tabla aparte (varias claves por worker, con nombre y fecha, para poder rotar una sin
tocar el resto).

## Cómo llegar a una VM ya iniciada

Tres capas, en orden de preferencia. Ninguna depende de SSH, que es el punto: si el
usuario borró `authorized_keys`, SSH ya no es una opción.

### 1. qemu-guest-agent (vía rápida, sin downtime)

Habla por el canal virtio serial (`org.qemu.guest_agent.0`), no por la red. Sigue
funcionando con `sshd` parado, con `authorized_keys` borrado y con ufw cerrando el 22.

```bash
virsh qemu-agent-command w-xxxxxx '{"execute":"guest-ping"}'
```

Para escribir el archivo conviene `guest-file-open` / `guest-file-write` /
`guest-file-close` antes que `guest-exec`: no depende de que el shell del guest esté
sano y algunas distros restringen `guest-exec` por configuración de qemu-ga.

**Requisito:** el paquete `qemu-guest-agent` tiene que estar instalado y habilitado en
el guest. Se agregó a `BASE_IMAGE_PACKAGES` en `LinuxHiveService`, pero eso **solo
aplica a imágenes nuevas** — las VMs creadas antes dependen de si la imagen de Ubuntu ya
lo traía. Verificar con el `guest-ping` de arriba antes de asumirlo.

### 2. Edición offline del disco (respaldo incondicional)

Con la VM apagada, `virt-customize` o `guestfish` montan el `.img` y reescriben
`authorized_keys` en el filesystem. Los dos binarios ya están en el sudoers; se usan
para preparar la imagen base.

Requiere apagar la VM, pero **siempre funciona**: el host es dueño del disco y nada de
lo que se haga desde adentro puede impedirlo.

### 3. Consola serie

**Implementado el 2026-07-29** (ver `docs/worker-console.md`). Cada worker nuevo recibe
una password random al crearse, guardada cifrada (`Worker.consolePassword`,
`SecretCipher`), horneada en el `chpasswd` del cloud-init — login solo local, `ssh_pwauth`
sigue en `false`. Al abrir la consola desde la UI, `cloud-scripts` la descifra y hace el
login por vos; nadie ve la password en texto plano. Sigue siendo la única vía que no
depende de nada de lo que el usuario pueda romper desde adentro (guest agent parado,
`authorized_keys` borrado, firewall del guest cerrado) — es el último recurso real.

Limitación: solo los workers creados después de este cambio tienen `consolePassword`. Los
anteriores quedan sin consola hasta que se recreen.

## Límite que no se puede cerrar

El usuario es root dentro de su VM, así que **puede parar el guest agent** y dejar la
capa 1 inservible. No es un agujero tapable: es consecuencia de darle root. Lo que lo
vuelve tolerable es que la capa 2 es incondicional.

Por eso el diseño debería ser **agente primero, offline como respaldo explícito**, con
la UI avisando que esa segunda vía implica apagar la VM.

## Boceto de implementación

- Tabla o campo para las claves públicas de cada worker (fuente de verdad)
- Evento `WORKER_UPDATE_SSH_KEYS` + su processor
- Método nuevo en `HiveService` que intente el agente y reporte con claridad si no
  responde
- Flag opcional de "forzar (apaga y reinicia la VM)" para el camino offline
- Diálogo en la UI de detalle del worker, disponible en cualquier estado

## Relacionado

- `SshKeyPermissionsNote.tsx` — parche actual al problema de permisos en Windows al
  descargar la privada. Si se deja de generar el par en el navegador, deja de hacer
  falta.
- El par generado es RSA 2048; ed25519 sería lo actual, pero node-forge no lo soporta
  bien.
