UPDATE "AtomImage"
SET "command" = ARRAY[
    'sh',
    '-c',
    ': "${MONGO_INITDB_ROOT_USERNAME:?is required}" "${MONGO_INITDB_ROOT_PASSWORD:?is required}" && umask 077 && rm -f /tmp/mongo.pem && cat /certs/*.crt /certs/*.key > /tmp/mongo.pem && chown mongodb:mongodb /tmp/mongo.pem && exec docker-entrypoint.sh mongod --auth --bind_ip_all --tlsMode requireTLS --tlsCertificateKeyFile /tmp/mongo.pem --tlsCAFile /etc/ssl/certs/ca-certificates.crt --tlsAllowConnectionsWithoutCertificates --setParameter authenticationMechanisms=SCRAM-SHA-256 --maxConns 256'
]
WHERE "name" = 'mongodb-8';
