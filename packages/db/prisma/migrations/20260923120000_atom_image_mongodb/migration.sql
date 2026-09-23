INSERT INTO "AtomImage" (
    "name",
    "description",
    "registry",
    "repository",
    "defaultTag",
    "architecture",
    "capabilities",
    "command",
    "requiredEnvVars",
    "dataPaths",
    "certMountPoint",
    "defaultSizeId"
)
SELECT
    'mongodb-8',
    'MongoDB 8.0, TLS-only with SCRAM-SHA-256 authentication. Requires MONGO_INITDB_ROOT_USERNAME and MONGO_INITDB_ROOT_PASSWORD. Attach a volume at /data/db to persist data.',
    'docker.io',
    'library/mongo',
    '8.0',
    'amd64',
    ARRAY[]::TEXT[],
    ARRAY[
        'sh',
        '-c',
        ': "${MONGO_INITDB_ROOT_USERNAME:?is required}" "${MONGO_INITDB_ROOT_PASSWORD:?is required}" && umask 077 && cat /certs/*.crt /certs/*.key > /tmp/mongo.pem && chown mongodb:mongodb /tmp/mongo.pem && exec docker-entrypoint.sh mongod --auth --bind_ip_all --tlsMode requireTLS --tlsCertificateKeyFile /tmp/mongo.pem --tlsCAFile /etc/ssl/certs/ca-certificates.crt --tlsAllowConnectionsWithoutCertificates --setParameter authenticationMechanisms=SCRAM-SHA-256'
    ],
    ARRAY['MONGO_INITDB_ROOT_USERNAME', 'MONGO_INITDB_ROOT_PASSWORD'],
    ARRAY['/data/db'],
    '/certs',
    "id"
FROM "AtomSize"
WHERE "name" = 'medium' AND "deprecatedAt" IS NULL
ORDER BY "version" DESC
LIMIT 1
ON CONFLICT ("name") DO NOTHING;
