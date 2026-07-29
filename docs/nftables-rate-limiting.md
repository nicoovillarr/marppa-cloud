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

## Related context

- `apps/cloud-scripts/README.md` → "nftables base ruleset" and "Coexisting with fail2ban
  and other nftables users"
- The host runbook, at `/home/nvillar/docs/cloud-ops.md`
