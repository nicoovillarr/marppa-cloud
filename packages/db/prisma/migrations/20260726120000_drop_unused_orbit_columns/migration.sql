-- Drops orbit columns that no consumer ever read.
--
-- Portal: TLS is Caddy's automatic ACME, so the listen flags and the certificate
-- pair were never rendered into a site file; portal-level cacheEnabled was shadowed
-- by the per-transponder one; defaultServer only produced a warning.
--
-- Transponder: removeHeaders had no reader at all, and addHeaders/proxyHeaders/
-- customIPAddress had no way to be set (no DTO, no entity field) now that a
-- transponder must be linked to a node. proxyReadTimeout is kept: its default
-- still shapes every generated route.

-- AlterTable
ALTER TABLE "Portal"
  DROP COLUMN "listenHttp",
  DROP COLUMN "listenHttps",
  DROP COLUMN "sslCertificate",
  DROP COLUMN "sslKey",
  DROP COLUMN "cacheEnabled",
  DROP COLUMN "defaultServer";

-- AlterTable
ALTER TABLE "Transponder"
  DROP COLUMN "addHeaders",
  DROP COLUMN "proxyHeaders",
  DROP COLUMN "removeHeaders",
  DROP COLUMN "customIPAddress";
