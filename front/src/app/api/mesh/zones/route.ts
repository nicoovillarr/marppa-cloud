import { CustomResponse } from "@/libs/custom-response";
import { EventHelper } from "@/libs/event-helper";
import NetmaskHelper from "@/libs/netmask-helper";
import prisma from "@/libs/prisma";
import Security from "@/libs/security";
import { EventType, ResourceStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import z from "zod";

import "@/libs/extensions/string-extension";

export async function GET(request: NextRequest): Promise<Response> {
  const user = await Security.getUser(request);
  if (!user) {
    return new CustomResponse().status(401).json({ error: "Unauthorized" });
  }

  const companies = await Security.getUserCompanies(user.companyId);

  const zones = await prisma.zone.findMany({
    where: {
      ownerId: { in: companies || [] },
      status: { not: ResourceStatus.DELETED },
    },
    include: {
      nodes: true,
    },
  });

  return new CustomResponse().status(200).json(zones);
}

export async function POST(request: NextRequest): Promise<Response> {
  const user = await Security.getUser(request);

  const schema = z.object({
    companyId: z.string(),
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

  const { companyId, name, description } = response.data;

  if (!Security.hasUserCompanyAccess(user.companyId, companyId)) {
    return new CustomResponse().status(403).json({ error: "Forbidden" });
  }

  const existingZones = await prisma.zone.findMany({
    where: {
      ownerId: companyId,
      status: {
        not: ResourceStatus.DELETED,
      },
    },
  });

  if (
    existingZones.some((zone) => zone.name.toLowerCase() === name.toLowerCase())
  ) {
    return new CustomResponse()
      .status(409)
      .json({ error: "Zone with this name already exists" });
  }

  const { cidr, gateway } = NetmaskHelper.getNextSubnet(existingZones);

  const zone = await prisma.zone.create({
    data: {
      name,
      description,
      cidr,
      gateway,
      createdBy: user.id,
      updatedBy: user.id,
      owner: {
        connect: { id: companyId },
      },
    },
  });

  const event = await EventHelper.createEvent(
    EventType.ZONE_CREATE,
    user.id,
    companyId
  );

  await EventHelper.addEventResource(event.id, "Zone", zone.id);

  return new CustomResponse().status(201).json(zone);
}

export async function DELETE(request: NextRequest) {
  const user = await Security.getUser(request);

  const schema = z.array(z.string());

  const response = await schema.safeParseAsync(await request.json());
  if (!response.success) {
    return new CustomResponse()
      .status(400)
      .json({ error: "Invalid input", details: response.error.errors });
  }

  const zoneIds = response.data;

  const zones = await prisma.zone.findMany({
    where: {
      id: { in: zoneIds },
      status: { not: ResourceStatus.DELETED },
    },
  });

  if (
    !(await Security.hasUserCompaniesAccess(
      user.companyId,
      zones.map((w) => w.ownerId)
    ))
  ) {
    return new CustomResponse().status(403).json({ error: "Forbidden" });
  }

  const activeNodes = await prisma.node.count({
    where: {
      zoneId: { in: zones.map((w) => w.id) },
      status: { not: ResourceStatus.DELETED },
    },
  });

  if (activeNodes > 0) {
    return new CustomResponse()
      .status(400)
      .json({ error: "Cannot delete zones with existing nodes" });
  }

  const companyId = await Security.findTopmostCompanyId(
    zones.map((w) => w.ownerId).distinct()
  );

  await prisma.zone.updateMany({
    where: {
      id: { in: zones.map((w) => w.id) },
    },
    data: {
      status: ResourceStatus.QUEUED,
      updatedBy: user.id,
    },
  });

  const event = await EventHelper.createEvent(
    EventType.ZONE_DELETE,
    user.id,
    companyId
  );

  await Promise.all(
    zones.map((zone) => EventHelper.addEventResource(event.id, "Zone", zone.id))
  );

  return new CustomResponse().status(204).end();
}
