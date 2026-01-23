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
        updatedBy: event.createdBy,
      },
    });

    sendWorkerMessage(worker, 'UPDATED', {
      status,
    });
  };

  try {
    const resourceWorker = event.resources.find(
      (r) => r.resourceType === 'Worker',
    );

    if (!resourceWorker) {
      await abort(
        `No worker resource found for event ID: ${event.id}`,
        EventType.WORKER_CREATE_FAILED,
      );
      return;
    }

    worker = await prisma.worker.findUnique({
      where: {
        id: resourceWorker.resourceId,
        status: { not: ResourceStatus.DELETED },
      },
      include: {
        image: true,
        instanceType: true,
      },
    });

    if (!worker) {
      await abort(
        `Worker not found for event ID: ${event.id}`,
        EventType.WORKER_CREATE_FAILED,
      );
      return;
    }

    if (worker.status !== ResourceStatus.QUEUED) {
      await abort(
        `Worker is not in QUEUED status for event ID: ${event.id}`,
        EventType.WORKER_CREATE_FAILED,
      );
      return;
    }

    const publicSshProp = event.properties.find((r) => r.key === 'PublicSSH');

    if (!(await hiveService.ensureWorkerImageExists(worker.image))) {
      await abort(
        `Could not generate worker image for event ID: ${event.id}.`,
        EventType.WORKER_CREATE_FAILED,
      );
      return;
    }

    await updateWorkerStatus(ResourceStatus.PROVISIONING);

    await hiveService.createWorker(
      worker.id,
      worker.name,
      worker.macAddress,
      worker.image,
      worker.instanceType,
      publicSshProp ? [publicSshProp.value] : [],
    );

    await updateWorkerStatus(ResourceStatus.INACTIVE);

    sendWorkerMessage(worker, 'CREATED', worker);

    const eventCreated = await createEvent(
      EventType.WORKER_CREATED,
      event.createdBy,
      event.companyId,
    );

    await addEventResource(eventCreated.id, 'Event', event.id);
    await addEventResource(eventCreated.id, 'Worker', worker.id);
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
