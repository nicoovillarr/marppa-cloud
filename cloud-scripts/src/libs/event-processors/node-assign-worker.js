const { ResourceStatus, EventType } = require('@prisma/client');
const prisma = require('../prisma');
const meshService = require('../../services/mesh.service');
const hiveService = require('../../services/hive.service');
const { createEvent, addEventResource } = require('../event-helper');
const { sendNodeMessage, sendWorkerMessage } = require('../web-sockets');

const process = async (event) => {
  let node;

  const updateNodeStatus = async (status) => {
    await prisma.node.update({
      where: { id: node.id },
      data: {
        status,
        updatedBy: event.createdBy,
      },
    });

    sendNodeMessage(node, 'UPDATED', {
      status,
    });
  };

  try {
    const resourceNode = event.resources.find((r) => r.resourceType === 'Node');
    if (!resourceNode) {
      throw new Error(`No node resource found for event ID: ${event.id}`);
    }

    node = await prisma.node.findUnique({
      where: {
        id: resourceNode.resourceId,
        status: { not: ResourceStatus.DELETED },
      },
      include: {
        zone: true,
        fibers: true,
        transponders: true,
      },
    });

    if (!node) {
      throw new Error(`Node not found for event ID: ${event.id}`);
    }

    if (node.status !== ResourceStatus.QUEUED) {
      throw new Error(`Node is not in QUEUED state for event ID: ${event.id}`);
    }

    const resourceWorker = event.resources.find(
      (r) => r.resourceType === 'Worker',
    );

    if (!resourceWorker) {
      throw new Error(`No worker resource found for event ID: ${event.id}`);
    }

    const worker = await prisma.worker.findUnique({
      where: {
        id: resourceWorker.resourceId,
        status: { not: ResourceStatus.DELETED },
      },
    });

    if (!worker) {
      throw new Error(`Worker not found for event ID: ${event.id}`);
    }

    if (worker.status !== ResourceStatus.INACTIVE) {
      throw new Error(
        `Worker is not in INACTIVE state for event ID: ${event.id}`,
      );
    }

    await updateNodeStatus(ResourceStatus.PROVISIONING);

    await meshService.addNodeToZone(
      node.zoneId,
      worker.macAddress,
      node.ipAddress,
    );

    await hiveService.editWorkerZone(worker.id, node.zoneId, worker.macAddress);

    await prisma.worker.update({
      where: { id: worker.id },
      data: {
        node: { connect: { id: node.id } },
        updatedBy: event.createdBy,
      },
    });

    await updateNodeStatus(ResourceStatus.ACTIVE);

    sendWorkerMessage(worker, 'UPDATED', { node });

    const createdEvent = await createEvent(
      EventType.NODE_ASSIGNED_WORKER,
      event.createdBy,
      event.companyId,
    );

    await addEventResource(createdEvent.id, 'Event', event.id);
    await addEventResource(createdEvent.id, 'Node', node.id);
    await addEventResource(createdEvent.id, 'Worker', worker.id);
  } catch (error) {
    console.error(`Error processing event ID ${event.id}:`, error);

    if (node) {
      await updateNodeStatus(
        event.retries >= 4 ? ResourceStatus.FAILED : ResourceStatus.QUEUED,
      );
    }

    throw error;
  }
};

module.exports = process;
