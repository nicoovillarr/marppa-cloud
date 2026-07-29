# Managing a worker's SSH keys

**Status:** implemented on 2026-07-25, **not tested against a real VM**. What follows
describes the design and what was left out.

Implemented: `WorkerSshKey` table, `GET/POST/DELETE /hive/workers/:id/ssh-keys`
endpoints, the `WORKER_UPDATE_SSH_KEYS` event with its processor, and the keys section
in the worker's admin dialog.

The processor picks the path based on the VM's state: **powered on** writes through the
guest agent, **powered off** writes straight to disk with `virt-customize`. If the VM is
on but the agent doesn't respond, it fails and asks to power it off — editing a running
VM's disk corrupts the filesystem.

## The need

Being able to add, rotate and remove a worker's public keys from the UI **at any time**,
even with the VM already running. Today it's only possible at creation time.

## How it works today

1. `CreateWorkerForm.tsx:177` generates an RSA 2048 pair **in the browser** with
   node-forge.
2. The private key is shown once to download; it never leaves the client.
3. The public key travels to the back as `publicSSH`, which dispatches it as the
   `PublicSSH` property of the `WORKER_CREATE` event.
4. `WorkerCreateProcessor` reads it and `LinuxHiveService` writes it into cloud-init's
   `ssh_authorized_keys`.

**Cloud-init only runs on first boot.** After that, nothing touches
`authorized_keys` again.

## Constraint that needs solving first

**The public key isn't persisted anywhere.** There's no `ssh` field in the schema —
neither on `Worker` nor any other model. It travels as a transient event property and
gets lost.

Managing keys needs a source of truth: a field on `Worker` or, better, a separate table
(several keys per worker, with a name and date, so one can be rotated without touching
the rest).

## How to reach an already-running VM

Three layers, in order of preference. None depends on SSH, which is the whole point: if
the user deleted `authorized_keys`, SSH is no longer an option.

### 1. qemu-guest-agent (fast path, no downtime)

Talks over the virtio serial channel (`org.qemu.guest_agent.0`), not over the network.
Keeps working with `sshd` stopped, `authorized_keys` deleted, and ufw blocking port 22.

```bash
virsh qemu-agent-command w-xxxxxx '{"execute":"guest-ping"}'
```

To write the file, `guest-file-open` / `guest-file-write` / `guest-file-close` is
preferable to `guest-exec`: it doesn't depend on the guest's shell being healthy, and
some distros restrict `guest-exec` via qemu-ga configuration.

**Requirement:** the `qemu-guest-agent` package must be installed and enabled in the
guest. It was added to `BASE_IMAGE_PACKAGES` in `LinuxHiveService`, but that **only
applies to new images** — VMs created before that depend on whether the Ubuntu image
already shipped it. Verify with the `guest-ping` above before assuming it.

### 2. Offline disk editing (unconditional fallback)

With the VM powered off, `virt-customize` or `guestfish` mount the `.img` and rewrite
`authorized_keys` on the filesystem. Both binaries are already in the sudoers; they're
used to prepare the base image.

Requires powering off the VM, but **always works**: the host owns the disk and nothing
done from inside can prevent it.

### 3. Serial console

**Implemented on 2026-07-29** (see `docs/worker-console.md`). Every new worker gets a
random password at creation time, stored encrypted (`Worker.consolePassword`,
`SecretCipher`), baked into cloud-init's `chpasswd` — local login only, `ssh_pwauth`
stays `false`. When the console is opened from the UI, `cloud-scripts` decrypts it and
logs in for you; nobody sees the plaintext password. It remains the only path that
doesn't depend on anything the user could break from inside (guest agent stopped,
`authorized_keys` deleted, guest firewall closed) — it's the real last resort.

Limitation: only workers created after this change have `consolePassword`. Earlier ones
have no console until they're recreated.

## Limit that can't be closed

The user is root inside their VM, so **they can stop the guest agent** and render layer
1 useless. It's not a pluggable hole: it's a consequence of giving them root. What makes
it tolerable is that layer 2 is unconditional.

That's why the design should be **agent first, offline as an explicit fallback**, with
the UI warning that the second path means powering off the VM.

## Implementation sketch

- Table or field for each worker's public keys (source of truth)
- `WORKER_UPDATE_SSH_KEYS` event + its processor
- New method on `HiveService` that tries the agent and reports clearly if it doesn't
  respond
- Optional "force (powers off and restarts the VM)" flag for the offline path
- Dialog in the worker detail UI, available in any state

## Related

- `SshKeyPermissionsNote.tsx` — current patch for the Windows permissions issue when
  downloading the private key. If the pair stops being generated in the browser, this
  stops being needed.
- The generated pair is RSA 2048; ed25519 would be current practice, but node-forge
  doesn't support it well.
