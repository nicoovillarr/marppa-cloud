const prisma = require('../prisma');
const { ResourceStatus, EventType } = require('@prisma/client');
const meshService = require('../../services/mesh.service');
const { createEvent, addEventResource } = require('../event-helper');

const process = async (event) => {
  let zone;

  const updateZoneStatus = async (status) =>
    await prisma.zone.update({
      where: { id: zone.id },
      data: {
        status,
        updatedBy: event.createdBy,
      },
    });

  try {
    const resourceZone = event.resources.find((r) => r.resourceType === 'Zone');
    if (!resourceZone) {
      throw new Error(`No zone resource found for event ID: ${event.id}`);
    }

    zone = await prisma.zone.findUnique({
      where: {
        id: resourceZone.resourceId,
        status: { not: ResourceStatus.DELETED },
      },
    });

    if (!zone) {
      throw new Error(`Zone not found for event ID: ${event.id}`);
    }

    if (zone.status !== ResourceStatus.QUEUED) {
      throw new Error(`Zone is not in QUEUED state for event ID: ${event.id}`);
    }

    await updateZoneStatus(ResourceStatus.PROVISIONING);

    await meshService.createZone(zone.cidr, zone.id);

    await updateZoneStatus(ResourceStatus.ACTIVE);

    const createdEvent = await createEvent(
      EventType.ZONE_CREATED,
      event.createdBy,
      event.companyId,
    );

    await addEventResource(createdEvent.id, 'Event', event.id);
    await addEventResource(createdEvent.id, 'Zone', zone.id);
  } catch (error) {
    if (zone) {
      await updateZoneStatus(
        event.retries >= 4 ? ResourceStatus.FAILED : ResourceStatus.QUEUED,
      );
    }

    throw error;
  }
};

module.exports = process;
