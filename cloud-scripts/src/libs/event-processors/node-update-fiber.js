const { ResourceStatus, EventType } = require('@prisma/client');
const prisma = require('../prisma');
const meshService = require('../../services/mesh.service');
const orbitService = require('../../services/orbit.service');
const { createEvent, addEventResource } = require('../event-helper');

const addCompleteEvent = async (originalEvent, fiberId) => {
  const createdEvent = await createEvent(
    EventType.NOIDE_FIBER_UPDATED,
    originalEvent.createdBy,
    originalEvent.companyId,
  );

  await addEventResource(createdEvent.id, 'Event', originalEvent.id);
  await addEventResource(createdEvent.id, 'Fiber', fiberId);
};

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

    if (fiber.status !== ResourceStatus.ACTIVE) {
      throw new Error(
        `Fiber is not in ACTIVE status for event ID: ${event.id}`,
      );
    }

    const newTargetPort = event.properties.find(
      (p) => p.key === 'NEW_TARGET_PORT',
    );

    const newProtocol = event.properties.find((p) => p.key === 'NEW_PROTOCOL');

    if (!newTargetPort || !newProtocol) {
      console.warn(
        `Missing NEW_TARGET_PORT or NEW_PROTOCOL for event ID: ${event.id}. Skipping...`,
      );
      await addCompleteEvent(event, fiber.id);
      return;
    }

    const actualPort = newTargetPort
      ? parseInt(newTargetPort.value, 10)
      : fiber.targetPort;
    const actualProtocol = newProtocol ? newProtocol.value : fiber.protocol;

    const portIsAvailable = await meshService.isPortAvailable(
      fiber.node.ipAddress,
      actualPort,
      actualProtocol,
    );

    if (!portIsAvailable) {
      await abort(
        `Port ${actualPort}/${actualProtocol} is not available for ${fiber.node.ipAddress}.`,
        EventType.NODE_UPDATE_FIBER_FAILED,
      );
      return;
    }

    await updateFiberStatus(ResourceStatus.PROVISIONING);

    await meshService.removeFiber(
      fiber.node.zoneId,
      fiber.protocol,
      fiber.hostPort,
      fiber.node.ipAddress,
      fiber.targetPort,
    );

    await meshService.addFiber(
      fiber.node.zoneId,
      actualProtocol,
      actualPort,
      fiber.node.ipAddress,
      fiber.targetPort,
    );

    await updateFiberStatus(ResourceStatus.ACTIVE);

    await addCompleteEvent(event, fiber.id);
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
