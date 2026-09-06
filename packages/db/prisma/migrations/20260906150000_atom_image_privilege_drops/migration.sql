-- Redis only drops to its own user when argv[1] is literally `redis-server`; the shell
-- wrapper needed to expand $REDIS_PASSWORD displaces it, so the container ran as root.
-- The chown and setpriv below reproduce what the image's entrypoint would have done.
UPDATE "AtomImage"
SET "command" = ARRAY[
        'sh',
        '-c',
        'chown -R redis /data && exec setpriv --reuid redis --regid redis --clear-groups redis-server --requirepass "$REDIS_PASSWORD" --appendonly yes --dir /data'
    ]
WHERE "repository" = 'library/redis';

-- wg-easy's default PostUp shells out to iptables-legacy, which needs NET_RAW — the
-- sniffing and ARP forging primitive the zone isolation depends on not being granted.
-- iptables-nft reaches the same kernel tables over netlink, which NET_ADMIN alone covers,
-- so the tunnel comes up with tenant-safe capabilities. The rules land in the container's
-- own network namespace and never touch the host ruleset.
UPDATE "AtomImage"
SET "command" = ARRAY[
        'sh',
        '-c',
        'export WG_POST_UP="iptables-nft -t nat -A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE; iptables-nft -A FORWARD -i wg0 -j ACCEPT; iptables-nft -A FORWARD -o wg0 -j ACCEPT;"; export WG_POST_DOWN="iptables-nft -t nat -D POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE; iptables-nft -D FORWARD -i wg0 -j ACCEPT; iptables-nft -D FORWARD -o wg0 -j ACCEPT;"; exec /usr/bin/dumb-init node server.js'
    ],
    "capabilities" = ARRAY['NET_ADMIN'],
    "sysctls" = '{"net.ipv4.ip_forward": "1"}'::jsonb
WHERE "repository" = 'wg-easy/wg-easy';
