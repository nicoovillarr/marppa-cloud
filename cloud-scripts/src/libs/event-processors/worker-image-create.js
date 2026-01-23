const prisma = require('../prisma');
const { ResourceStatus, EventType } = require('@prisma/client');
const hiveService = require('../../services/hive.service');
const { createEvent, addEventResource } = require('../event-helper');

const process = async (event, abort) => {
  let worker;

  try {
    const resourceWorkerImage = event.resources.find(
      (r) => r.resourceType === 'WorkerImage',
    );

    if (!resourceWorkerImage) {
      await abort(
        `No worker image resource found for event ID: ${event.id}`,
        EventType.WORKER_IMAGE_CREATE_FAILED,
      );
      return;
    }

    const workerImage = await prisma.workerImage.findUnique({
      where: { id: Number(resourceWorkerImage.resourceId) },
    });

    if (!workerImage) {
      await abort(
        `Worker image not found for event ID: ${event.id}`,
        EventType.WORKER_IMAGE_CREATE_FAILED,
      );
      return;
    }

    if (!(await hiveService.ensureWorkerImageExists(workerImage))) {
      await abort(
        `Could not generate worker image for event ID: ${event.id}.`,
        EventType.WORKER_IMAGE_CREATE_FAILED,
      );
      return;
    }

    const eventCreated = await createEvent(
      EventType.WORKER_IMAGE_CREATED,
      event.createdBy,
      event.companyId,
    );

    await addEventResource(eventCreated.id, 'Event', event.id);
    await addEventResource(eventCreated.id, 'WorkerImage', workerImage.id);
  } catch (error) {
    if (worker) {
      await updateWorkerStatus(
        event.retries >= 4 ? ResourceStatus.FAILED : ResourceStatus.QUEUED,
      );
    }

    throw error;
  }
};

module.exports = process;
