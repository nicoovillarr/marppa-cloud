# Pending: nftables rate limiting (DoS defense)

**Status:** not implemented. Noted on 2026-07-24 to tackle later.

## The need

Protect the host from an attacker **inside the local network** trying to saturate it:
connection floods, socket exhaustion, aggressive scanning.

## Why fail2ban doesn't cover this

fail2ban already runs on the host (`sshd` jail, `banaction = nftables-multiport`,
`maxretry 3`, `bantime 1h`) and **doesn't solve this problem**. It reacts to patterns in
the logs: N auth failures within a window, only then does it ban. Against a flood it
does nothing — the packets already arrived and the service is already saturated before
the first log line even appears.

fail2ban covers **brute force**. This is a different front and needs another tool.

## Where the solution goes

Native nftables rate limiting on the `input` chain, something like:

- `ct count` per source IP to cap concurrent connections
- `limit rate` on new connections (`ct state new`) towards 22, 80 and 443

The actual numbers need to be measured against real traffic before fixing them: a
badly-calibrated limit cuts off legitimate users and is worse than having nothing.

## Design constraint — important

The rules **go in `/etc/nftables-base.conf`**, the file pointed at by
`NFTABLES_RESET_SOURCE`. Not in the live ruleset.

Reason: `saveNftConfiguration` persists whatever is in `inet filter` and `ip nat`, so a
rule added by hand survives reboots. But `forceResetMesh` (the `SYSTEM_RESET` event)
**recreates both tables from the base file**, and takes with it anything not there. A
rate-limiting rule added live disappears on the first reset, silently.

The preflight validates that the base file only declares `inet filter` and `ip nat`, so
new rules have to go inside those tables, not a separate one.

## Second front: DNAT'd fiber ports (added 2026-08-07)

The section above assumes the attacker is on the LAN and the target is the host itself,
so it puts everything on `input`. A survey of the live host on 2026-08-07 turned up a
second front that `input` never sees.

The router forwards `20000-30000` to the host, so every allocated fiber is reachable
from the internet. Two of them publish a VM's SSH:

```
22526 -> 10.0.0.10:22
27162 -> 10.0.0.2:22
23668 -> 10.0.0.11:25565
```

These are for external clients and are staying open — routing them through the VPN was
considered and rejected. So the host has to defend them.

**fail2ban cannot cover this.** Its `sshd` jail runs `backend = systemd` against the
*host* journal. A brute force against `10.0.0.10:22` authenticates inside the VM and
logs inside the VM: nothing reaches the host's journal, so nothing is ever counted or
banned. Today those ports are unmetered and unlogged, while the host's own port 22 sees
~1800 password attempts in 5 days from ~160 IPs.

**Chain matters here.** The DNAT lands in `prerouting`, so by the time the packet is
routed its destination is `10.0.0.x` and it traverses **`forward`**, not `input`. Rules
written for `input` will never match this traffic.

Sketch, to be calibrated:

```
set ssh_abusers {
  type ipv4_addr
  flags dynamic, timeout
  timeout 1h
}

chain forward {
  ip saddr @ssh_abusers drop
  ct state new iifname "enp5s0" ip daddr 10.0.0.0/29 tcp dport 22 \
    add @ssh_abusers { ip saddr limit rate over 6/minute burst 3 } drop
}
```

That is a fail2ban-shaped auto-ban implemented natively, which is what the situation
needs: it sees packets rather than logs, so it works for services whose logs live in a
guest.

Generalize it over zone CIDRs, not hardcoded prefixes. Today the zones are
`10.0.0.0/29` and `10.0.0.8/29`, and new ones appear whenever a zone is created — the
rule has to be emitted per zone or expressed over the whole allocation range, or it
silently stops covering new zones.

## Close unallocated fiber ports

The router forwards all of `MIN_PORT`-`MAX_PORT` (`20000-30000` in `.env.local`), but
only allocated fibers get a DNAT rule. The other ~9997 ports pass the router, find no
DNAT, and reach the host's `input` chain — whose policy is `accept`.

Nothing listens there today, so nothing is exposed *right now*. The risk is latent: the
day any process binds a high port on `0.0.0.0`, it is published to the internet with no
second gate. That includes a container with a published port, or a one-off
`python -m http.server`.

Fix is one rule in `input`, since DNAT'd packets never arrive there:

```
iifname "enp5s0" tcp dport 20000-30000 drop
iifname "enp5s0" udp dport 20000-30000 drop
```

Read `MIN_PORT`/`MAX_PORT` rather than hardcoding, so the rule cannot drift from the
allocator in `LinuxMeshService.findAvailablePort`.

Before enforcing, land it as `counter` instead of `drop` and let it run: a non-zero
counter would mean the reasoning above is wrong and some legitimate traffic does reach
`input` on that range.

Narrowing the forwarded range at the router was considered as an alternative. It is
worse: allocated ports are spread across the range (`22526`, `23668`, `27162`), so
shrinking it forces reallocating live fibers, which changes the port external clients
connect to.

## Related context

- `apps/cloud-scripts/README.md` → "nftables base ruleset" and "Coexisting with fail2ban
  and other nftables users"
- The host runbook, at `/home/nvillar/docs/cloud-ops.md`
