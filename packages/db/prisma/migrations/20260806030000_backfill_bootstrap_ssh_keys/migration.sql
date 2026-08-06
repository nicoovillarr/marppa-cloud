-- The key a worker is created with was only ever sent to cloud-init as an event
-- property, never stored as a WorkerSshKey row. Since WORKER_UPDATE_SSH_KEYS
-- rewrites authorized_keys from those rows, the first key added through the UI
-- wiped the bootstrap key. Recover it from the WORKER_CREATE event that carried it.
-- "updatedAt" is @updatedAt, which Prisma fills from the client and never as a
-- database default, so raw SQL has to supply it or the NOT NULL rejects the row.
INSERT INTO "WorkerSshKey" ("name", "publicKey", "workerId", "createdAt", "createdBy", "updatedAt")
SELECT
    'bootstrap',
    btrim(property."value"),
    worker."id",
    worker."createdAt",
    worker."createdBy",
    worker."createdAt"
FROM "Worker" worker
JOIN "EventResource" resource
    ON resource."resourceId" = worker."id"
    AND resource."resourceType" = 'Worker'
JOIN "Event" event
    ON event."id" = resource."eventId"
    AND event."type" = 'WORKER_CREATE'
JOIN "EventProperty" property
    ON property."eventId" = event."id"
    AND property."key" = 'PublicSSH'
WHERE worker."status" <> 'DELETED'
  AND btrim(property."value") <> ''
ON CONFLICT ("workerId", "publicKey") DO NOTHING;
