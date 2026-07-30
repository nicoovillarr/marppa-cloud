-- CreateTable
CREATE TABLE "AuditLog" (
    "id" BIGSERIAL NOT NULL,
    "tableName" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "rowId" TEXT,
    "actor" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_tableName_rowId_idx" ON "AuditLog"("tableName", "rowId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- Secrets are never copied into the log: a row that leaks them here defeats the
-- point of storing them once. "app.actor" stays NULL until the application sets
-- it per transaction; a NULL actor means "not attributed", never "nobody".
CREATE OR REPLACE FUNCTION audit_row_change() RETURNS trigger AS $audit$
DECLARE
    redacted TEXT[] := ARRAY['password', 'apiKey', 'consolePassword', 'refreshToken'];
    before_row JSONB;
    after_row JSONB;
    key TEXT;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        before_row := to_jsonb(OLD);
    ELSIF (TG_OP = 'UPDATE') THEN
        before_row := to_jsonb(OLD);
        after_row := to_jsonb(NEW);
    ELSE
        after_row := to_jsonb(NEW);
    END IF;

    FOREACH key IN ARRAY redacted LOOP
        before_row := before_row - key;
        after_row := after_row - key;
    END LOOP;

    IF (TG_TABLE_NAME = 'AtomEnvVar') THEN
        before_row := before_row - 'value';
        after_row := after_row - 'value';
    END IF;

    INSERT INTO "AuditLog" ("tableName", "operation", "rowId", "actor", "before", "after")
    VALUES (
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(after_row, before_row) ->> 'id',
        NULLIF(current_setting('app.actor', true), ''),
        before_row,
        after_row
    );

    RETURN NULL;
END;
$audit$ LANGUAGE plpgsql;

-- Session and Token churn on every login and tick, and Event/EventResource/
-- EventProperty are already an append-only record, so auditing them buys noise.
DO $attach$
DECLARE
    audited TEXT[] := ARRAY[
        'Worker', 'WorkerSshKey', 'WorkerImage', 'WorkerFamily', 'WorkerFlavor',
        'WorkerStorageType', 'WorkerDisk', 'HostCapacity',
        'Atom', 'AtomImage', 'AtomSize', 'AtomEnvVar',
        'Zone', 'Node', 'Fiber',
        'Portal', 'Transponder',
        'Company', 'User'
    ];
    target TEXT;
BEGIN
    FOREACH target IN ARRAY audited LOOP
        EXECUTE format(
            'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %I
             FOR EACH ROW EXECUTE FUNCTION audit_row_change()',
            'audit_' || target, target
        );
    END LOOP;
END
$attach$;
