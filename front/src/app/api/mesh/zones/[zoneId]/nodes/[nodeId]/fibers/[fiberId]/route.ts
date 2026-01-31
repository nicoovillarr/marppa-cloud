import { CustomResponse } from "@/libs/custom-response";
import { EventHelper } from "@/libs/event-helper";
import prisma from "@/libs/prisma";
import Security from "@/libs/security";
import { EventType, ResourceStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ zoneId: string; nodeId: string; fiberId: number }> }
) {
  const user = await Security.getUser(request);
  if (!user) {
    return new CustomResponse().status(401).json({
      message: "Unauthorized",
    });
  }

  const { zoneId, nodeId, fiberId } = await params;

  const { ownerId } = await prisma.zone.findUnique({
    where: { id: zoneId },
    select: { ownerId: true },
  });

  if (!ownerId || !(await Security.hasUserCompanyAccess(user.id, ownerId))) {
    return new CustomResponse().status(403).json({
      message: "Forbidden",
    });
  }

  const fiber = await prisma.fiber.findUnique({
    where: { id: fiberId, nodeId, status: { not: ResourceStatus.DELETED } },
  });

  if (!fiber) {
    return new CustomResponse().status(404).json({
      message: "Fiber not found",
    });
  }

  return new CustomResponse().status(200).json(fiber);
}

export async function PUT(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ zoneId: string; nodeId: string; fiberId: number }> }
) {
  const user = await Security.getUser(request);
  if (!user) {
    return new CustomResponse().status(401).json({
      message: "Unauthorized",
    });
  }

  const { zoneId, nodeId, fiberId } = await params;

  const { ownerId } = await prisma.zone.findUnique({
    where: { id: zoneId },
    select: { ownerId: true },
  });

  if (!(await Security.hasUserCompanyAccess(user.id, ownerId))) {
    return new CustomResponse().status(403).json({
      message: "Forbidden",
    });
  }

  const fiber = await prisma.fiber.findUnique({
    where: { id: fiberId, nodeId, status: { not: ResourceStatus.DELETED } },
  });

  if (!fiber) {
    return new CustomResponse().status(404).json({
      message: "Fiber not found",
    });
  }

  const schema = z.object({
    protocol: z.enum(["tcp", "udp"]),
    targetPort: z.number().int().min(1).max(65535),
  });

  const response = await schema.safeParseAsync(await request.json());
  if (!response.success) {
    return new CustomResponse().status(400).json({
      message: "Invalid request data",
      errors: response.error.errors,
    });
  }

  const { protocol, targetPort } = response.data;

  const fibers = await prisma.fiber.findMany({
    where: {
      id: { not: fiberId },
      nodeId,
      targetPort,
      protocol,
      status: { not: ResourceStatus.DELETED },
    },
  });

  if (fibers.length > 0) {
    return new CustomResponse().status(409).json({
      message: "Fiber with the same protocol and target port already exists",
    });
  }

  const updatedFiber = await prisma.fiber.update({
    where: { id: fiberId },
    data: {
      protocol,
      targetPort,
      status: ResourceStatus.QUEUED,
      updatedBy: user.id,
    },
  });

  const createdEvent = await EventHelper.createEvent(
    EventType.NODE_UPDATE_FIBER,
    user.id,
    ownerId
  );

  await EventHelper.addEventResource(
    createdEvent.id,
    "Fiber",
    updatedFiber.id.toString()
  );

  if (fiber.protocol !== protocol) {
    await EventHelper.addEventProperty(
      createdEvent.id,
      "NEW_PROTOCOL",
      protocol
    );
  }

  if (fiber.targetPort !== targetPort) {
    await EventHelper.addEventProperty(
      createdEvent.id,
      "NEW_TARGET_PORT",
      targetPort.toString()
    );
  }

  return new CustomResponse().status(200).json(updatedFiber);
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      zoneId: string;
      nodeId: string;
      fiberId: number;
    }>;
  }
) {
  const user = await Security.getUser(request);
  if (!user) {
    return new CustomResponse().status(401).json({
      message: "Unauthorized",
    });
  }

  const { zoneId, nodeId, fiberId } = await params;

  const { ownerId } = await prisma.zone.findUnique({
    where: { id: zoneId },
    select: { ownerId: true },
  });

  if (!(await Security.hasUserCompanyAccess(user.id, ownerId))) {
    return new CustomResponse().status(403).json({
      message: "Forbidden",
    });
  }

  const fiber = await prisma.fiber.findUnique({
    where: { id: fiberId, nodeId },
  });

  if (!fiber) {
    return new CustomResponse().status(404).json({
      message: "Fiber not found",
    });
  }

  if (fiber.status !== ResourceStatus.ACTIVE) {
    return new CustomResponse().status(400).json({
      message: "Fiber is not active",
    });
  }

  const createdEvent = await EventHelper.createEvent(
    EventType.NODE_DELETE_FIBER,
    user.id,
    ownerId
  );

  await EventHelper.addEventResource(
    createdEvent.id,
    "Fiber",
    fiber.id.toString()
  );

  return new CustomResponse().status(204).end();
}
