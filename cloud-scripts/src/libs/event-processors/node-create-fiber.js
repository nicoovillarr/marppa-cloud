const { ResourceStatus, EventType } = require('@prisma/client');
const prisma = require('../prisma');
const meshService = require('../../services/mesh.service');
const { createEvent, addEventResource } = require('../event-helper');
const { sendNodeMessage } = require('../web-sockets');

const process = async (event, abort) => {
  let fiber;

  const updateFiberStatus = async (status) =>
    await prisma.fiber.update({
      where: { id: fiber.id },
      data: {
        status,
        updatedBy: event.createdBy,
      },
    });

  try {
    const resourceFiber = event.resources.find(
      (r) => r.resourceType === 'Fiber',
    );
    if (!resourceFiber) {
      throw new Error(`No node resource found for event ID: ${event.id}`);
    }

    fiber = await prisma.fiber.findUnique({
      where: {
        id: Number(resourceFiber.resourceId),
        status: { not: ResourceStatus.DELETED },
      },
      include: {
        node: true,
      },
    });

    if (!fiber) {
      throw new Error(`Node Fiber not found for event ID: ${event.id}`);
    }

    if (fiber.status !== ResourceStatus.QUEUED) {
      await abort(
        `Fiber is not in QUEUED status for event ID: ${event.id}`,
        EventType.NODE_CREATE_FIBER_FAILED,
      );
      return;
    }

    const portIsAvailable = await meshService.isPortAvailable(
      fiber.node.ipAddress,
      fiber.targetPort,
      fiber.protocol,
    );

    if (!portIsAvailable) {
      await abort(
        `Port ${fiber.targetPort}/${fiber.protocol} is not available for ${fiber.node.ipAddress}.`,
        EventType.NODE_CREATE_FIBER_FAILED,
      );
      return;
    }

    await updateFiberStatus(ResourceStatus.PROVISIONING);

    const hostPort = await meshService.findNextPort(fiber.protocol);

    await meshService.addFiber(
      fiber.node.zoneId,
      fiber.protocol,
      hostPort,
      fiber.node.ipAddress,
      fiber.targetPort,
    );

    await prisma.fiber.update({
      where: { id: fiber.id },
      data: {
        hostPort,
        status: ResourceStatus.ACTIVE,
        updatedBy: event.createdBy,
      },
    });

    const createdEvent = await createEvent(
      EventType.NODE_FIBER_CREATED,
      event.createdBy,
      event.companyId,
    );

    await addEventResource(createdEvent.id, 'Event', event.id);
    await addEventResource(createdEvent.id, 'Fiber', fiber.id);
  } catch (error) {
    console.error(`Error processing event ID ${event.id}:`, error);

    if (fiber) {
      await updateFiberStatus(
        event.retries >= 4 ? ResourceStatus.FAILED : ResourceStatus.QUEUED,
      );
    }

    throw error;
  }
};

module.exports = process;
