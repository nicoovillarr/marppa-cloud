const { ResourceStatus, EventType } = require('@prisma/client');
const prisma = require('../prisma');
const meshService = require('../../services/mesh.service');
const { createEvent, addEventResource } = require('../event-helper');

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
      abort(
        `Node Fiber not found for event ID: ${event.id}`,
        EventType.NODE_DELETE_FIBER_FAILED,
      );
      return;
    }

    if (fiber.status !== ResourceStatus.QUEUED) {
      await abort(
        `Fiber is not in QUEUED status for event ID: ${event.id}`,
        EventType.NODE_DELETE_FIBER_FAILED,
      );
      return;
    }

    await updateFiberStatus(ResourceStatus.DELETING);

    await meshService.removeFiber(
      fiber.node.zoneId,
      fiber.protocol,
      fiber.hostPort,
      fiber.node.ipAddress,
      fiber.targetPort,
    );

    await updateFiberStatus(ResourceStatus.DELETED);

    const createdEvent = await createEvent(
      EventType.NODE_FIBER_DELETED,
      originalEvent.createdBy,
      originalEvent.companyId,
    );

    await addEventResource(createdEvent.id, 'Event', originalEvent.id);
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
