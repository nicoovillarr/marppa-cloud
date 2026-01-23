const prisma = require('../prisma');
const { ResourceStatus, EventType } = require('@prisma/client');
const { createEvent, addEventResource } = require('../event-helper');
const hiveService = require('../../services/hive.service');
const meshService = require('../../services/mesh.service');
const { sendWorkerMessage } = require('../web-sockets');

const process = async (event) => {
  let worker;

  const updateWorkerStatus = async (status) => {
    await prisma.worker.update({
      where: { id: worker.id },
      data: {
        status,
        updatedBy: event.createdBy,
      },
    });

    sendWorkerMessage(worker, 'UPDATED', { status });
  };

  try {
    const resourceWorker = event.resources.find(
      (r) => r.resourceType === 'Worker',
    );
    if (!resourceWorker) {
      throw new Error(`No worker resource found for event ID: ${event.id}`);
    }

    worker = await prisma.worker.findUnique({
      where: { id: resourceWorker.resourceId },
      include: {
        node: true,
      },
    });

    if (!worker) {
      throw new Error(`Worker not found for event ID: ${event.id}`);
    }

    if (worker.status !== ResourceStatus.ACTIVE) {
      throw new Error(
        `Worker is not in ACTIVE state for event ID: ${event.id}`,
      );
    }

    const vnet = await hiveService.getWorkerVnet(worker.id, worker.node.zoneId);
    if (!vnet) {
      throw new Error(`VNet not found for worker ID: ${worker.id}`);
    }

    await updateWorkerStatus(ResourceStatus.TERMINATING);

    await meshService.unlinkVnetFromBridge(vnet, worker.node.zoneId);

    await hiveService.stopWorker(worker.id);

    await updateWorkerStatus(ResourceStatus.INACTIVE);

    sendWorkerMessage(worker.id, 'WORKER_TERMINATED');

    const eventUpdated = await createEvent(
      EventType.WORKER_TERMINATED,
      event.createdBy,
      event.companyId,
    );

    await addEventResource(eventUpdated.id, 'Event', event.id);
    await addEventResource(eventUpdated.id, 'Worker', worker.id);
  } catch (error) {
    console.error(`Error processing event ID ${event.id}:`, error);

    if (worker) {
      await prisma.worker.update({
        where: { id: worker.id },
        data: {
          status:
            event.retries >= 4 ? ResourceStatus.FAILED : ResourceStatus.QUEUED,
          updatedBy: event.createdBy,
        },
      });
    }

    throw error;
  }
};

module.exports = process;
