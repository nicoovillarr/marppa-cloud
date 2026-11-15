CREATE TABLE "DnsApiKey" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PortalType" NOT NULL,
    "apiKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "DnsApiKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DnsApiKey_ownerId_name_key" ON "DnsApiKey"("ownerId", "name");

ALTER TABLE "DnsApiKey" ADD CONSTRAINT "DnsApiKey_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Portal" ADD COLUMN "dnsApiKeyId" INTEGER;

ALTER TABLE "Portal" ADD CONSTRAINT "Portal_dnsApiKeyId_fkey" FOREIGN KEY ("dnsApiKeyId") REFERENCES "DnsApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "DnsApiKey" ("name", "type", "apiKey", "createdAt", "createdBy", "updatedAt", "ownerId")
SELECT
    initcap(lower(keys."type"::TEXT)) || ' key ' || row_number() OVER (PARTITION BY keys."ownerId" ORDER BY keys."firstCreatedAt"),
    keys."type",
    keys."apiKey",
    keys."firstCreatedAt",
    keys."createdBy",
    CURRENT_TIMESTAMP,
    keys."ownerId"
FROM (
    SELECT DISTINCT ON ("ownerId", "type", "apiKey")
        "ownerId", "type", "apiKey", "createdBy", "createdAt" AS "firstCreatedAt"
    FROM "Portal"
    WHERE "status" <> 'DELETED'
    ORDER BY "ownerId", "type", "apiKey", "createdAt"
) AS keys;

UPDATE "Portal" AS p
SET "dnsApiKeyId" = k."id"
FROM "DnsApiKey" AS k
WHERE k."ownerId" = p."ownerId"
  AND k."type" = p."type"
  AND k."apiKey" = p."apiKey"
  AND p."status" <> 'DELETED';

ALTER TABLE "Portal" DROP COLUMN "apiKey";

CREATE TRIGGER "audit_DnsApiKey" AFTER INSERT OR UPDATE OR DELETE ON "DnsApiKey"
FOR EACH ROW EXECUTE FUNCTION audit_row_change();
