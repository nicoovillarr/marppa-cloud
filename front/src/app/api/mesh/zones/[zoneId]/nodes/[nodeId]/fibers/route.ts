import { CustomResponse } from "@/libs/custom-response";
import { EventHelper } from "@/libs/event-helper";
import prisma from "@/libs/prisma";
import Security from "@/libs/security";
import { EventType, ResourceStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ zoneId: string; nodeId: string }> }
) {
  const user = await Security.getUser(request);
  if (!user) {
    return new CustomResponse().status(401).json({
      message: "Unauthorized",
    });
  }

  const { zoneId, nodeId } = await params;

  const zone = await prisma.zone.findUnique({
    where: { id: zoneId },
    select: { ownerId: true },
  });

  if (!zone) {
    return new CustomResponse().status(404).json({
      message: "Zone not found",
    });
  }

  if (!zone.ownerId || !(await Security.hasUserCompanyAccess(user.id, zone.ownerId))) {
    return new CustomResponse().status(403).json({
      message: "Forbidden",
    });
  }

  const fibers = await prisma.fiber.findMany({
    where: { nodeId, status: { not: ResourceStatus.DELETED } },
  });

  if (!fibers) {
    return new CustomResponse().status(404).json({
      message: "Fibers not found",
    });
  }

  return new CustomResponse().status(200).json(fibers);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ zoneId: string; nodeId: string }> }
) {
  const user = await Security.getUser();
  if (!user) {
    return new CustomResponse().status(401).json({
      message: "Unauthorized",
    });
  }

  const { zoneId, nodeId } = await params;

  const { ownerId } = await prisma.zone.findUnique({
    where: { id: zoneId },
    select: { ownerId: true },
  });

  if (!ownerId || !(await Security.hasUserCompanyAccess(user.id, ownerId))) {
    return new CustomResponse().status(403).json({
      message: "Forbidden",
    });
  }

  const nodes = await prisma.node.count({
    where: { id: nodeId, zoneId, status: { not: ResourceStatus.DELETED } },
  });

  if (nodes === 0) {
    return new CustomResponse().status(404).json({
      message: "Node not found in the specified zone",
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

  const fiber = await prisma.fiber.create({
    data: {
      nodeId,
      protocol,
      targetPort,
      createdBy: user.id,
      updatedBy: user.id,
    },
  });

  const createdEvent = await EventHelper.createEvent(
    EventType.NODE_CREATE_FIBER,
    user.id,
    ownerId
  );

  await EventHelper.addEventResource(
    createdEvent.id,
    "Fiber",
    fiber.id.toString()
  );

  return new CustomResponse().status(201).json(fiber);
}
