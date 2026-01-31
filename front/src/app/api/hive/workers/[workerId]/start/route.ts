import { CustomResponse } from "@/libs/custom-response";
import { EventHelper } from "@/libs/event-helper";
import prisma from "@/libs/prisma";
import Security from "@/libs/security";
import { EventType, ResourceStatus } from "@prisma/client";
import { NextRequest } from "next/server";

export async function POST(
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

  if (!worker || !(await Security.hasUserCompanyAccess(user.id, worker.ownerId))) {
    return new CustomResponse().status(404).json({
      message: "Worker not found",
    });
  }

  if (worker.status !== ResourceStatus.INACTIVE) {
    return new CustomResponse().status(400).json({
      message: "Worker is not inactive",
    });
  }

  if (worker.node === null) {
    return new CustomResponse().status(400).json({
      message: "Worker does not have an assigned node",
    });
  }

  if (worker.node.status !== ResourceStatus.ACTIVE) {
    return new CustomResponse().status(400).json({
      message: "Worker's node is not active",
    });
  }

  const event = await EventHelper.createEvent(
    EventType.WORKER_START,
    user.id,
    worker.ownerId
  );

  await EventHelper.addEventResource(event.id, "Worker", worker.id);

  return new CustomResponse().status(204).end();
}
