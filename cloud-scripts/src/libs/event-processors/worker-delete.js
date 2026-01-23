const prisma = require('../prisma');
const { ResourceStatus, EventType } = require('@prisma/client');
const hiveService = require('../../services/hive.service');
const { createEvent, addEventResource } = require('../event-helper');
const { sendWorkerMessage } = require('../web-sockets');

const process = async (event, abort) => {
  let worker;

  const updateWorkerStatus = async (status) => {
    await prisma.worker.update({
      where: { id: worker.id },
      data: {
        status,
        updatedBy: worker.updatedBy,
      },
    });

    sendWorkerMessage(worker, 'UPDATED', { status });
  };

  try {
    const resourceWorker = event.resources.find(
      (r) => r.resourceType === 'Worker',
    );
    if (!resourceWorker) {
      abort(
        `No worker resource found for event ID: ${event.id}`,
        EventType.WORKER_DELETE_FAILED,
      );
      return;
    }

    worker = await prisma.worker.findUnique({
      where: {
        id: resourceWorker.resourceId,
        status: { not: ResourceStatus.DELETED },
      },
      include: {
        node: true,
      },
    });

    if (!worker) {
      abort(
        `Worker not found for event ID: ${event.id}`,
        EventType.WORKER_DELETE_FAILED,
      );
      return;
    }

    if (worker.status !== ResourceStatus.QUEUED) {
      abort(
        `Worker is not in QUEUED state for event ID: ${event.id}`,
        EventType.WORKER_DELETE_FAILED,
      );
      return;
    }

    if (await hiveService.isWorkerRunning(worker.id)) {
      abort(`Worker ${worker.id} is running`, EventType.WORKER_DELETE_FAILED);
      return;
    }

    if (worker.node) {
      abort(
        `Worker ${worker.id} is assigned to a node`,
        EventType.WORKER_DELETE_FAILED,
      );
      return;
    }

    await updateWorkerStatus(ResourceStatus.DELETING);

    await hiveService.deleteWorker(worker.id);

    await updateWorkerStatus(ResourceStatus.DELETED);

    sendWorkerMessage(worker, 'DELETED');

    const createdEvent = await createEvent(
      EventType.WORKER_DELETED,
      event.createdBy,
      event.companyId,
    );

    await addEventResource(createdEvent.id, 'Event', event.id);
    await addEventResource(createdEvent.id, 'Worker', worker.id);
  } catch (error) {
    console.error(`Error processing event ID ${event.id}:`, error);

    if (worker) {
      await updateWorkerStatus(
        event.retries >= 4 ? ResourceStatus.FAILED : ResourceStatus.QUEUED,
      );
    }

    throw error;
  }
};

module.exports = process;
