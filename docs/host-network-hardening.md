# Host-level network hardening (egress/ingress substitute for VLAN/DMZ)

**Status:** ruleset ready to apply. Pending someone with access to the real host
adapting it (WAN interface, admin IP, DNS resolvers) and applying it.

## Why this exists

The security audit (2026-07-28) left one item open: segmenting the Cloud Scripts host
into a real VLAN/DMZ. That needs a router/switch with 802.1Q tagging and inter-VLAN
firewalling support — something a typical ISP router doesn't have.

Without that Layer 2 separation, a firewall on the host itself **does not isolate the
host from the rest of the LAN** (any other device still sees it over ARP on the same
wire), but it does limit **what that host can do** if it's compromised: it can't scan
the LAN, it can't exfiltrate data to arbitrary destinations, and nothing on the LAN can
reach it except what's explicitly allowed. It's the strongest mitigation available
without buying new hardware.

## Design constraint — same one as `nftables-rate-limiting.md`

The rules go in `/etc/nftables-base.conf` (the file pointed at by
`NFTABLES_RESET_SOURCE`), not in the live ruleset: `forceResetMesh` recreates `inet
filter` and `ip nat` from that file on every `SYSTEM_RESET`, so any rule added by hand
to the live ruleset disappears on the next reset, silently.

## The ruleset

Replace `<WAN_IF>`, `<ADMIN_IP>` and the DNS resolvers with the host's real values. This
block assumes `chain input { policy drop; ... }` already exists (inherited from the
current base ruleset) and only adds/adjusts what's missing:

```
table inet filter {
  chain input {
    type filter hook input priority 0; policy drop;

    # (existing rules: established/related, WS 443, fiber range, etc.)

    # Inbound from the LAN: blocked except explicit administration.
    ip saddr 192.168.0.0/16 tcp dport 22 ip saddr != <ADMIN_IP> drop
    ip saddr 10.0.0.0/8 tcp dport 22 ip saddr != <ADMIN_IP> drop
    ip saddr 172.16.0.0/12 tcp dport 22 ip saddr != <ADMIN_IP> drop
  }

  chain output {
    type filter hook output priority 0; policy drop;

    ct state established,related accept
    oif lo accept

    # DNS and NTP — adjust to the real resolvers/servers.
    udp dport { 53, 123 } accept
    tcp dport 53 accept

    # Postgres/Redis, if they live off-host.
    tcp dport { 5432, 6379 } accept

    # Base image downloads (ALLOWED_IMAGE_DOMAINS) and OS updates.
    tcp dport { 80, 443 } accept

    # Traffic the mesh itself needs to generate towards zones/bridges.
    oifname "<WAN_IF>" accept
  }
}
```

Notes:

- The `policy drop` on `output` is the new piece: nftables accepts all outbound traffic
  by default unless an explicit policy is declared. `NftablesRuleset.hasDefaultDenyOutputPolicy()`
  detects exactly this.
- The sample `input` rules block SSH from RFC1918 ranges except a fixed admin IP; adjust
  the ranges to your real LAN subnet.
- If the host runs other outbound services (SMTP for notifications, a private docker
  registry, etc.), add their own explicit `accept` rule in `output` before relying on
  the default-deny.

## Automatic verification (opt-in)

Set `REQUIRE_EGRESS_HARDENING="true"` in `apps/cloud-scripts`'s `.env` so
`HostPreflightService` fails at boot if `NFTABLES_RESET_SOURCE` doesn't declare an
`output` chain with `policy drop`. Defaults to `false` so it doesn't break existing
installs that haven't applied this ruleset yet.

## What's still unresolved

This **does not replace** a real VLAN/DMZ: Layer 2 separation (a compromised device on
the LAN not even being able to see the host on the network) is still pending hardware.
See `README.md`, "Network segmentation (VLAN/DMZ)" section.
