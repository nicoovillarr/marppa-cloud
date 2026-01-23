const prisma = require('./prisma');
const fs = require('fs');
const path = require('path');
const {
  getPublicIPAddress,
  batchUpdateDynamicDNS,
} = require('../services/orbit.service');

const { createEvent, addEventResource } = require('./event-helper');
const { ResourceStatus } = require('@prisma/client');

let isProcessing = false;
async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  const processableEventKeys = fs
    .readdirSync(path.join(__dirname, 'event-processors'))
    .filter((file) => file.endsWith('.js'))
    .map((file) => file.replace('.js', '').toUpperCase().replace(/-/g, '_'));

  const events = (
    await prisma.event.findMany({
      where: {
        processedAt: null,
        failedAt: null,
        retries: {
          lt: 5,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        resources: true,
        properties: true,
      },
    })
  ).filter((e) => processableEventKeys.includes(e.type));

  if (events.length === 0) {
    isProcessing = false;
    return;
  }

  for (const event of events) {
    const { id, type, data } = event;
    const queueProcessor = require(`./event-processors/${type
      .toLowerCase()
      .replace(/_/g, '-')}`);

    if (typeof queueProcessor !== 'function') {
      console.error(`No processor found for event type: ${type}`);
      continue;
    }

    console.log(`Processing event ID: ${id}, Type: ${type}`);

    try {
      let aborted = false;
      await queueProcessor(event, async (msg, eventType) => {
        aborted = true;

        if (msg) {
          console.error(msg);
        }

        if (eventType) {
          const failedEvent = await createEvent(
            eventType,
            event.createdBy,
            event.companyId,
            null,
            msg ?? 'Event processing failed',
          );

          await addEventResource(failedEvent.id, 'Event', event.id);
        }

        await prisma.event.update({
          where: { id: event.id },
          data: {
            failedAt: new Date(),
          },
        });
      });

      if (aborted) continue;

      console.log(`Successfully processed event ID: ${id}`);

      await prisma.event.update({
        where: { id: event.id },
        data: {
          processedAt: new Date(),
        },
      });
    } catch (err) {
      console.error(`Failed to process event ID: ${event.id}`, err);
      await prisma.event.update({
        where: { id: event.id },
        data: {
          retries: { increment: 1 },
        },
      });
    }
  }

  isProcessing = false;
}

function startQueueProcessor(intervalMs = 15000) {
  const loop = async () => {
    const started = new Date();

    await processQueue();

    const remainingTime = intervalMs - (new Date() - started);

    setTimeout(loop, remainingTime > 0 ? remainingTime : 0);
  };
  loop();
}

function startReadLeases(intervalMs = 15000) {
  const loop = () => {
    const started = new Date();

    console.log('Reading dnsmasq leases:');

    try {
      const data = fs.readFileSync('/var/lib/misc/dnsmasq.leases', 'utf-8');
      console.log(data);
    } catch (err) {
      console.error('Error leyendo leases:', err);
    }

    const remainingTime = intervalMs - (new Date() - started);

    setTimeout(loop, remainingTime > 0 ? remainingTime : 0);
  };
  loop();
}

function startDeleteProcessor(intervalMs = 1000 * 60 * 5) {
  const loop = async () => {
    const started = new Date();

    const rows = await prisma.$queryRawUnsafe(`
      SELECT table_name
      FROM information_schema.columns
      WHERE column_name = 'status'
        AND udt_name = 'ResourceStatus'
    `);

    const tablesToCheck = rows.map((row) => row.table_name);

    for (const table of tablesToCheck) {
      console.log(`Deleting rows from table: ${table}`);

      await prisma.$executeRawUnsafe(`
        DELETE FROM "${table}"
        WHERE "status" = '${ResourceStatus.DELETED}'
          AND "updatedAt" < (NOW() AT TIME ZONE 'UTC') - INTERVAL '${
            intervalMs / 1000
          } SECOND'
      `);
    }

    const remainingTime = intervalMs - (new Date() - started);

    setTimeout(loop, remainingTime > 0 ? remainingTime : 0);
  };
  loop();
}

function startIPChecker(intervalMs = 1000 * 60 * 10) {
  let lastIP = null;

  const loop = async () => {
    const started = new Date();

    try {
      const ip = await getPublicIPAddress();
      if (ip && ip !== lastIP) {
        console.log(`Public IP changed from ${lastIP} to ${ip}`);
        lastIP = ip;
      }

      const portals = await prisma.portal.findMany({
        where: {
          status: ResourceStatus.ACTIVE,
          OR: [{ lastPublicIP: { not: ip } }, { lastPublicIP: null }],
        },
      });

      if (portals.length >= 0) {
        console.log(`Portals needing DNS update: ${portals.length}`);

        await batchUpdateDynamicDNS(
          portals.map((p) => ({
            id: p.id,
            address: p.address,
            type: p.type,
            apiKey: p.apiKey,
          })),
        );
      }
    } catch (err) {
      console.error('Error getting public IP:', err);
    }

    const remainingTime = intervalMs - (new Date() - started);

    setTimeout(loop, remainingTime > 0 ? remainingTime : 0);
  };

  loop();
}

module.exports = {
  startQueueProcessor,
  startDeleteProcessor,
  startReadLeases,
  startIPChecker,
};
