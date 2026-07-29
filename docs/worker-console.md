# Worker console

**Status:** implemented on 2026-07-29, **not tested against a real VM**.

Implemented: `Worker.consolePassword` field, `SecretCipher` (AES-256-GCM),
`WorkerConsoleService`, generalization of `WebSocketServer` for `atom` or
`worker` exec, and the "Console" button in the worker's admin dialog.

## The need

Recover access to a worker when SSH doesn't work — broken `authorized_keys`,
guest network down, misconfigured internal firewall — without losing the
disk (unlike recreating the VM from scratch).

## Why what existed wasn't enough

`virsh console` was already used in the code (`readVmConsole`, for one-shot
diagnostics), and `virt-install` already defines the VM with
`--console pty,target_type=serial` + GRUB with `console=ttyS0` — the serial
console itself already worked at the libvirt/QEMU level.

The problem: cloud-init's `ubuntu` user has `lock_passwd: true` and
`ssh_pwauth: false` — no password, anywhere. A serial console login (unlike
SSH) can't use the public key; it asks for username and password over the
tty, and there was nothing to authenticate with. `testWorkerLogin` doesn't
even verify a real login — it just matches text in the output (`ubuntu@` or
the `#` character, which shows up in the MOTD without logging in).

## How it works now

1. `WorkerCreateProcessor` generates a random password (`crypto.randomBytes`)
   when the worker is created.
2. It's used in plaintext once for cloud-init's `chpasswd`
   (`ssh_pwauth` stays `false` — this password is never usable over the
   network, only for a local login on the tty).
3. It's encrypted with `SecretCipher` (AES-256-GCM, key in
   `WORKER_CONSOLE_SECRET_KEY`) and stored in `Worker.consolePassword`.
4. When the console is opened from the UI, `WorkerConsoleService.open()`
   decrypts it, starts `sudo virsh console <vm> --force` over a pty
   (`node-pty`, same pattern as `DockerExecService`), and types `ubuntu` +
   the password as soon as it connects. The user sees the session already
   logged in.

Nobody outside `cloud-scripts` ever sees the plaintext password — there's no
endpoint to reveal it, no UI to copy it.

## Why it's encrypted and not plaintext (unlike `AtomEnvVar`)

`AtomEnvVar` is plaintext on purpose: those are tenant secrets for their own
app, and the platform operator already has host access regardless. This
password is different — it's a root-equivalent credential (`ubuntu` with
`NOPASSWD:ALL`) for *any* worker of *any* company. A leak of the `Worker`
table without encryption would be root shell over the entire fleet; with
encryption, `WORKER_CONSOLE_SECRET_KEY` is also required (lives in
`.env.local`, not in the DB).

## What was left out

- **Hot rotation.** The password is fixed once, at worker creation time
  (baked into that VM's cloud-init). There's no way to rotate it without
  recreating the VM. It could be added via `qemu-guest-agent`
  (`guest-exec` + `chpasswd`), the same channel `applySshKeys` already uses
  for SSH keys — but that depends on the agent being alive, which is
  exactly what might be broken in the scenario this feature covers. Left
  out on purpose: the console with the original password, baked in since
  boot, keeps working even if the agent is dead.
- **Workers created before this change.** They have `consolePassword = NULL`,
  no console available until they're recreated.

## Related

- `docs/worker-ssh-keys.md` — the same problem (reaching a VM without SSH)
  from the angle of keys instead of the console.
