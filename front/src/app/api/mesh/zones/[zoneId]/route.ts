import { CustomResponse } from "@/libs/custom-response";
import { EventHelper } from "@/libs/event-helper";
import prisma from "@/libs/prisma";
import Security from "@/libs/security";
import { EventType, ResourceStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import z from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ zoneId: string }> }
) {
  const user = await Security.getUser(request);
  if (!user) {
    return new CustomResponse().status(401).json({
      message: "Unauthorized",
    });
  }

  const { zoneId } = await params;

  const zone = await prisma.zone.findUnique({
    where: { id: zoneId, status: { not: ResourceStatus.DELETED } },
    include: {
      nodes: {
        where: { status: { not: ResourceStatus.DELETED } },
      },
    },
  });

  if (!zone || !(await Security.hasUserCompanyAccess(user.id, zone.ownerId))) {
    return new CustomResponse().status(404).json({
      message: "Zone not found",
    });
  }

  return new CustomResponse().status(200).json(zone);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ zoneId: string }> }
) {
  const user = await Security.getUser(request);
  if (!user) {
    return new CustomResponse().status(401).json({ error: "Unauthorized" });
  }

  const schema = z.object({
    name: z
      .string()
      .min(1, "Name is required")
      .transform((val) => val.sanitize()),
    description: z
      .string()
      .optional()
      .transform((val) => (val ? val.sanitize() : "")),
  });

  const response = await schema.safeParseAsync(await request.json());
  if (!response.success) {
    return new CustomResponse()
      .status(400)
      .json({ error: "Invalid input", details: response.error.errors });
  }

  const { zoneId } = await params;
  const { ownerId } = await prisma.zone.findUnique({
    where: { id: zoneId, status: { not: ResourceStatus.DELETED } },
    select: { ownerId: true },
  });

  if (!ownerId || !(await Security.hasUserCompanyAccess(user.id, ownerId))) {
    return new CustomResponse().status(404).json({ error: "Zone not found" });
  }

  const { name, description } = response.data;

  const updatedZone = await prisma.zone.update({
    where: { id: zoneId },
    data: { name, description },
  });

  return new CustomResponse().status(200).json(updatedZone);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ zoneId: string }> }
) {
  const user = await Security.getUser(request);
  if (!user) {
    return new CustomResponse().status(401).json({
      message: "Unauthorized",
    });
  }

  const { zoneId } = await params;

  const zone = await prisma.zone.findUnique({
    where: { id: zoneId, status: { not: ResourceStatus.DELETED } },
  });

  if (!zone || !(await Security.hasUserCompanyAccess(user.id, zone.ownerId))) {
    return new CustomResponse().status(404).json({
      message: "Zone not found",
    });
  }
  
  const activeNodes = await prisma.node.count({
    where: {
      zoneId: zoneId,
      status: { not: ResourceStatus.DELETED },
    },
  });

  if (activeNodes > 0) {
    return new CustomResponse().status(400).json({
      message: "Zone has associated nodes and cannot be deleted",
    });
  }

  await prisma.zone.update({
    where: { id: zoneId },
    data: { status: ResourceStatus.DELETED, updatedBy: user.id },
  });

  const createdEvent = await EventHelper.createEvent(
    EventType.ZONE_DELETE,
    user.id,
    zone.ownerId
  );

  await EventHelper.addEventResource(createdEvent.id, "Zone", zone.id);

  return new CustomResponse().status(204).end();
}
