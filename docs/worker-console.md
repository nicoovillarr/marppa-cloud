# Consola de worker

**Estado:** implementado el 2026-07-29, **sin probar contra una VM real**.

Implementado: campo `Worker.consolePassword`, `SecretCipher` (AES-256-GCM),
`WorkerConsoleService`, generalización de `WebSocketServer` para exec de
`atom` o `worker`, y el botón "Console" en el diálogo de administración del
worker.

## La necesidad

Recuperar acceso a un worker cuando SSH no sirve — `authorized_keys` roto, red
del guest caída, firewall interno mal configurado — sin perder el disco (a
diferencia de recrear la VM desde cero).

## Por qué no alcanzaba con lo que había

`virsh console` ya se usaba en el código (`readVmConsole`, para diagnóstico de
un solo tiro), y `virt-install` ya define la VM con
`--console pty,target_type=serial` + GRUB con `console=ttyS0` — la consola
serial en sí ya funcionaba a nivel libvirt/QEMU.

El problema: el `ubuntu` del cloud-init tiene `lock_passwd: true` y
`ssh_pwauth: false` — sin password, en ningún lado. Un login por consola
serial (a diferencia de SSH) no puede usar la key pública; pide usuario y
contraseña por tty, y no había con qué autenticarse. `testWorkerLogin` ni
siquiera verifica un login real — solo matchea texto en la salida (`ubuntu@` o
el carácter `#`, que aparece en el MOTD sin loguearse).

## Cómo funciona ahora

1. `WorkerCreateProcessor` genera una password random (`crypto.randomBytes`)
   al crear el worker.
2. La usa en texto plano una sola vez para el `chpasswd` del cloud-init
   (`ssh_pwauth` se mantiene en `false` — esta password nunca sirve por red,
   solo para un login local en la tty).
3. La cifra con `SecretCipher` (AES-256-GCM, clave en `WORKER_CONSOLE_SECRET_KEY`)
   y la guarda en `Worker.consolePassword`.
4. Al abrir la consola desde la UI, `WorkerConsoleService.open()` la descifra,
   arranca `sudo virsh console <vm> --force` sobre un pty (`node-pty`, mismo
   patrón que `DockerExecService`), y escribe `ubuntu` + la password apenas
   conecta. El usuario ve la sesión ya logueada.

Nadie fuera de `cloud-scripts` ve la password en texto plano — no hay endpoint
para revelarla, no hay UI para copiarla.

## Por qué está cifrada y no en texto plano (a diferencia de `AtomEnvVar`)

`AtomEnvVar` es texto plano a propósito: son secretos del tenant para su
propia app, y el operador de la plataforma ya tiene acceso al host de todas
formas. Esta password es distinta — es una credencial root-equivalente
(`ubuntu` con `NOPASSWD:ALL`) para *cualquier* worker de *cualquier* empresa.
Un leak de la tabla `Worker` sin el cifrado sería shell root sobre toda la
flota; con el cifrado, hace falta también `WORKER_CONSOLE_SECRET_KEY` (vive en
`.env.local`, no en la DB).

## Qué quedó afuera

- **Rotación en caliente.** La password se fija una sola vez, al crear el
  worker (horneada en el cloud-init de esa VM). No hay forma de rotarla sin
  recrear la VM. Podría agregarse vía `qemu-guest-agent` (`guest-exec` +
  `chpasswd`), mismo canal que ya usa `applySshKeys` para las keys SSH — pero
  eso depende de que el agente esté vivo, que es justo lo que puede estar
  roto en el escenario que esta feature cubre. Se dejó afuera a propósito:
  la consola con la password original, horneada desde el arranque, sigue
  funcionando aunque el agente esté muerto.
- **Workers creados antes de este cambio.** Tienen `consolePassword = NULL`,
  sin consola disponible hasta que se recreen.

## Relacionado

- `docs/worker-ssh-keys.md` — mismo problema (llegar a una VM sin SSH) desde
  el ángulo de las keys en vez de la consola.
