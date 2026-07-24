# Pendiente: rate limiting en nftables (defensa contra DoS)

**Estado:** no implementado. Anotado el 2026-07-24 para encararlo más adelante.

## La necesidad

Proteger el host de un atacante **dentro de la red local** que intente saturarlo:
flood de conexiones, agotamiento de sockets, escaneo agresivo.

## Por qué fail2ban no lo cubre

fail2ban ya está corriendo en el host (jail `sshd`, `banaction = nftables-multiport`,
`maxretry 3`, `bantime 1h`) y **no resuelve este problema**. Reacciona a patrones en los
logs: N fallos de autenticación dentro de una ventana, y recién ahí banea. Contra un
flood no hace nada — los paquetes ya llegaron y el servicio ya está saturado antes de
que aparezca la primera línea en el log.

fail2ban cubre **brute force**. Esto es un frente distinto y necesita otra herramienta.

## Por dónde va la solución

Rate limiting nativo de nftables en la chain `input`, algo del estilo:

- `ct count` por IP de origen para topear conexiones concurrentes
- `limit rate` sobre conexiones nuevas (`ct state new`) hacia 22, 80 y 443

Los números concretos hay que medirlos contra el tráfico real antes de fijarlos: un
límite mal calibrado corta usuarios legítimos y es peor que no tener nada.

## Restricción de diseño — importante

Las reglas **van en `/etc/nftables-base.conf`**, el archivo apuntado por
`NFTABLES_RESET_SOURCE`. No en el ruleset vivo.

Motivo: `saveNftConfiguration` persiste lo que haya en `inet filter` e `ip nat`, así que
una regla agregada a mano sobrevive reboots. Pero `forceResetMesh` (evento
`SYSTEM_RESET`) **recrea ambas tablas desde el base file**, y se lleva puesto todo lo que
no esté ahí. Una regla de rate limiting agregada en vivo desaparece en el primer reset,
en silencio.

El preflight valida que el base file declare solo `inet filter` e `ip nat`, así que las
reglas nuevas tienen que ir dentro de esas tablas, no en una tabla aparte.

## Contexto relacionado

- `apps/cloud-scripts/README.md` → "nftables base ruleset" y "Coexisting with fail2ban
  and other nftables users"
- El runbook del host, en `/home/nvillar/docs/cloud-ops.md`
