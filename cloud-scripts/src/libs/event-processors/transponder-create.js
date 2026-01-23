const prisma = require('../prisma');
const { ResourceStatus, EventType } = require('@prisma/client');
const orbitService = require('../../services/orbit.service');
const { createEvent, addEventResource } = require('../event-helper');

const process = async (event, abort) => {
  let transponder;

  const updateTransponderStatus = async (status) =>
    await prisma.transponder.update({
      where: { id: transponder.id },
      data: {
        status,
        updatedBy: event.createdBy,
      },
    });

  try {
    const resourceTransponder = event.resources.find(
      (r) => r.resourceType === 'Transponder',
    );

    if (!resourceTransponder) {
      await abort(
        `No transponder resource found for event ID: ${event.id}`,
        EventType.TRANSPONDER_CREATE_FAILED,
      );
      return;
    }

    transponder = await prisma.transponder.findUnique({
      where: {
        id: resourceTransponder.resourceId,
        status: { not: ResourceStatus.DELETED },
      },
      include: { portal: { include: { transponders: true } } },
    });

    if (!transponder) {
      await abort(
        `Portal not found for event ID: ${event.id}`,
        EventType.TRANSPONDER_CREATE_FAILED,
      );
      return;
    }

    const { portal, status } = transponder;

    console.log(portal);

    if (status !== ResourceStatus.QUEUED) {
      await abort(
        `Transponder status (${status}) is not valid for event ID: ${event.id}`,
        EventType.TRANSPONDER_CREATE_FAILED,
      );
      return;
    }

    await updateTransponderStatus(ResourceStatus.PROVISIONING);

    await orbitService.generateNginxConfig(portal, transponder.id);

    await updateTransponderStatus(ResourceStatus.ACTIVE);

    const eventCreated = await createEvent(
      EventType.TRANSPONDER_CREATED,
      event.createdBy,
      event.companyId,
    );

    await addEventResource(eventCreated.id, 'Event', event.id);
    await addEventResource(eventCreated.id, 'Transponder', transponder.id);
  } catch (error) {
    if (transponder) {
      await updateTransponderStatus(
        event.retries >= 4 ? ResourceStatus.FAILED : ResourceStatus.QUEUED,
      );
    }

    throw error;
  }
};

module.exports = process;
