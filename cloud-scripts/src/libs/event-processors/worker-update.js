const prisma = require('../prisma');
const { ResourceStatus, EventType } = require('@prisma/client');
const { createEvent, addEventResource } = require('../event-helper');
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

  await prisma.worker.update({
    where: { id: worker.id },
    data: {
      status,
      updatedBy: event.createdBy,
    },
  });

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

    const data = event.data || {};

    if (worker.status !== ResourceStatus.INACTIVE) {
      throw new Error(
        `Worker is not in INACTIVE state for event ID: ${event.id}`,
      );
    }

    await updateWorkerStatus(ResourceStatus.Promise);

    // Not implemented yet.
    // I'm not sure what kind of update we need to do for worker.
    // For now, we just simulate a delay.
    await new Promise((resolve) => setTimeout(resolve, 3500));

    await updateWorkerStatus(ResourceStatus.INACTIVE);

    const eventUpdated = await createEvent(
      EventType.WORKER_UPDATED,
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
