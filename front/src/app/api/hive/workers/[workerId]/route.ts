import { CustomResponse } from "@/libs/custom-response";
import { EventHelper } from "@/libs/event-helper";
import NetmaskHelper from "@/libs/netmask-helper";
import prisma from "@/libs/prisma";
import Security from "@/libs/security";
import { NodeDTO } from "@/libs/types/dto/node-dto";
import { EventType, ResourceStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";

import "@/libs/extensions/string-extension";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workerId: string }> }
) {
  const user = await Security.getUser(request);
  if (!user) {
    return new CustomResponse().status(401).json({
      message: "Unauthorized",
    });
  }

  const { workerId } = await params;

  const worker = await prisma.worker.findUnique({
    where: { id: workerId, status: { not: ResourceStatus.DELETED } },
    include: {
      image: true,
      instanceType: true,
      node: true,
      storages: true,
    },
  });

  if (
    !worker ||
    !(await Security.hasUserCompanyAccess(user.id, worker.ownerId))
  ) {
    return new CustomResponse().status(404).json({
      message: "Worker not found",
    });
  }

  return new CustomResponse().status(200).json(worker);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workerId: string }> }
) {
  const user = await Security.getUser(request);
  if (!user) {
    return new CustomResponse().status(401).json({
      message: "Unauthorized",
    });
  }

  const { workerId } = await params;

  const worker = await prisma.worker.findUnique({
    where: { id: workerId, status: { not: ResourceStatus.DELETED } },
    include: {
      node: {
        select: { id: true, zoneId: true },
      },
    },
  });

  if (
    !worker ||
    !(await Security.hasUserCompanyAccess(user.id, worker.ownerId))
  ) {
    return new CustomResponse().status(404).json({
      message: "Worker not found",
    });
  }

  if (worker.status !== ResourceStatus.INACTIVE) {
    return new CustomResponse().status(400).json({
      message: "You must stop the worker before updating it",
    });
  }

  const schema = z.object({
    name: z
      .string()
      .min(1)
      .transform((val) => val.sanitize()),
    zoneId: z.string().optional().nullable(),
  });

  const response = await schema.safeParseAsync(await request.json());
  if (!response.success) {
    return new CustomResponse().status(400).json({
      message: "Invalid request data",
      errors: response.error.errors,
    });
  }

  const { name, zoneId } = response.data;

  let node: NodeDTO | null = null;
  if (
    zoneId != null &&
    (worker.node == null || worker.node.zoneId !== zoneId)
  ) {
    const zone = await prisma.zone.findUnique({
      where: { id: zoneId },
      include: {
        nodes: {
          where: { status: { not: ResourceStatus.DELETED } },
        },
      },
    });

    if (
      !zone ||
      !(await Security.hasUserCompanyAccess(user.id, zone.ownerId))
    ) {
      return new CustomResponse().status(404).json({ error: "Zone not found" });
    }

    if (zone.status !== ResourceStatus.ACTIVE) {
      return new CustomResponse()
        .status(400)
        .json({ error: "Zone is not active" });
    }

    node = await NetmaskHelper.getNextNode(zone);

    const assignEvent = await EventHelper.createEvent(
      EventType.NODE_ASSIGN_WORKER,
      user.id,
      worker.ownerId
    );

    await EventHelper.addEventResource(assignEvent.id, "Worker", worker.id);
    await EventHelper.addEventResource(assignEvent.id, "Node", node.id);
  } else if (zoneId == null && worker.node) {
    const unassignEvent = await EventHelper.createEvent(
      EventType.NODE_UNASSIGN_WORKER,
      user.id,
      worker.ownerId
    );

    await EventHelper.addEventResource(unassignEvent.id, "Worker", worker.id);
    await EventHelper.addEventResource(
      unassignEvent.id,
      "Node",
      worker.node.id
    );
  }

  const updated = await prisma.worker.update({
    where: { id: workerId },
    data: {
      name,
    },
    include: {
      node: true,
    },
  });

  const changes = {};
  for (const key in updated) {
    if (updated[key] !== worker[key] && typeof updated[key] !== "object") {
      console.log(
        `Change detected in ${key}: ${worker[key]} -> ${updated[key]}`
      );
      changes[key] = {
        oldValue: worker[key],
        newValue: updated[key],
      };
    }
  }

  if (Object.keys(changes).length > 0) {
    const event = await EventHelper.createEvent(
      EventType.WORKER_UPDATE,
      user.id,
      worker.ownerId,
      changes
    );

    await EventHelper.addEventResource(event.id, "Worker", updated.id);
  }

  return new CustomResponse().status(200).json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workerId: string }> }
) {
  const user = await Security.getUser(request);
  if (!user) {
    return new CustomResponse().status(401).json({
      message: "Unauthorized",
    });
  }

  const { workerId } = await params;

  const worker = await prisma.worker.findUnique({
    where: { id: workerId, status: { not: ResourceStatus.DELETED } },
    include: {
      node: true,
    },
  });

  if (
    !worker ||
    !(await Security.hasUserCompanyAccess(user.id, worker.ownerId))
  ) {
    return new CustomResponse().status(404).json({
      message: "Worker not found",
    });
  }

  if (worker.status !== ResourceStatus.INACTIVE) {
    return new CustomResponse().status(400).json({
      message: "You must stop the worker before deleting it.",
    });
  }

  if (worker.node) {
    return new CustomResponse().status(400).json({
      message:
        "Worker has an assigned node. Unassign the worker from the node first.",
    });
  }

  await prisma.worker.update({
    where: { id: workerId },
    data: { status: ResourceStatus.QUEUED, updatedBy: user.id },
  });

  const event = await EventHelper.createEvent(
    EventType.WORKER_DELETE,
    user.id,
    worker.ownerId
  );

  await EventHelper.addEventResource(event.id, "Worker", worker.id);

  return new CustomResponse().status(204).end();
}
