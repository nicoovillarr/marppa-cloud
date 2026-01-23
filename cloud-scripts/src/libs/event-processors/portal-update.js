const prisma = require('../prisma');
const { ResourceStatus, EventType } = require('@prisma/client');
const orbitService = require('../../services/orbit.service');
const { createEvent, addEventResource } = require('../event-helper');

const process = async (event, abort) => {
  let portal;

  const updatePortalStatus = async (status) =>
    await prisma.portal.update({
      where: { id: portal.id },
      data: {
        status,
        updatedBy: event.createdBy,
      },
    });

  try {
    const resourcePortal = event.resources.find(
      (r) => r.resourceType === 'Portal',
    );

    if (!resourcePortal) {
      await abort(
        `No portal resource found for event ID: ${event.id}`,
        EventType.PORTAL_UPDATE_FAILED,
      );
      return;
    }

    portal = await prisma.portal.findUnique({
      where: {
        id: resourcePortal.resourceId,
        status: { not: ResourceStatus.DELETED },
      },
    });

    if (!portal) {
      await abort(
        `Portal not found for event ID: ${event.id}`,
        EventType.PORTAL_UPDATE_FAILED,
      );
      return;
    }

    const forceSync = event.properties.find(
      (p) =>
        p.key === 'FORCE_SYNC' &&
        ['true', '1', 'yes'].includes(p.value.toLowerCase()),
    );

    if (forceSync) {
      const { status } = portal;

      if (status !== ResourceStatus.QUEUED) {
        await abort(
          `Portal status (${status}) is not valid for event ID: ${event.id}`,
          EventType.PORTAL_UPDATE_FAILED,
        );
        return;
      }

      await updatePortalStatus(ResourceStatus.PROVISIONING);

      await orbitService.updateDynamicDNS(
        portal.id,
        portal.address,
        portal.type,
        portal.apiKey,
      );

      await updatePortalStatus(status);
    }

    const eventCreated = await createEvent(
      EventType.PORTAL_UPDATED,
      event.createdBy,
      event.companyId,
    );

    await addEventResource(eventCreated.id, 'Event', event.id);
    await addEventResource(eventCreated.id, 'Portal', portal.id);
  } catch (error) {
    if (portal) {
      await updatePortalStatus(
        event.retries >= 4 ? ResourceStatus.FAILED : ResourceStatus.QUEUED,
      );
    }

    throw error;
  }
};

module.exports = process;
