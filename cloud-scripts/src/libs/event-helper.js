const prisma = require('./prisma');

async function createEvent(type, createdBy, companyId, data, notes = null) {
  const event = await prisma.event.create({
    data: {
      type,
      notes,
      data: data != null ? JSON.stringify(data) : null,
      createdBy,
      company: {
        connect: { id: companyId },
      },
    },
  });

  return event;
}

async function addEventResource(eventId, resourceType, resourceId) {
  await prisma.eventResource.create({
    data: {
      eventId,
      resourceId: resourceId.toString(),
      resourceType,
    },
  });
}

module.exports = {
  createEvent,
  addEventResource,
};
