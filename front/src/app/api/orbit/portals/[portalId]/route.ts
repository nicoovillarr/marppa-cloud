import { CustomResponse } from "@/libs/custom-response";
import { EventHelper } from "@/libs/event-helper";
import prisma from "@/libs/prisma";
import Security from "@/libs/security";
import { EventType, PortalType, ResourceStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import z from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string }> }
): Promise<Response> {
  const user = await Security.getUser(request);
  if (!user) {
    return new CustomResponse()
      .status(401)
      .json({ error: "You must be logged in to perform this action." });
  }

  const { portalId } = await params;

  if (!portalId) {
    return new CustomResponse()
      .status(400)
      .json({ error: "Portal ID is required in the URL." });
  }

  const portal = await prisma.portal.findFirst({
    where: { id: portalId, status: { not: ResourceStatus.DELETED } },
    include: {
      zone: true,
      transponders: {
        where: { status: { not: ResourceStatus.DELETED } },
        include: {
          node: true,
        },
      },
    },
  });

  if (
    !portal ||
    !(await Security.hasUserCompanyAccess(user.id, portal.ownerId))
  ) {
    return new CustomResponse()
      .status(404)
      .json({ error: "Portal not found." });
  }

  delete portal.apiKey;

  return new CustomResponse().status(200).json(portal);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string }> }
): Promise<Response> {
  const user = await Security.getUser(request);

  if (!user) {
    return new CustomResponse()
      .status(401)
      .json({ error: "You must be logged in to perform this action." });
  }

  const { portalId } = await params;

  if (!portalId) {
    return new CustomResponse()
      .status(400)
      .json({ error: "Portal ID is required in the URL." });
  }

  const existingPortal = await prisma.portal.findUnique({
    where: { id: portalId, status: { not: ResourceStatus.DELETED } },
    include: { transponders: true },
  });

  if (
    !existingPortal ||
    !(await Security.hasUserCompanyAccess(user.id, existingPortal.ownerId))
  ) {
    return new CustomResponse()
      .status(404)
      .json({ error: "Portal not found." });
  }

  if (existingPortal.status !== ResourceStatus.ACTIVE) {
    return new CustomResponse()
      .status(400)
      .json({ error: "Only active portals can be updated." });
  }

  const portalTypes: string[] = Object.keys(PortalType).map((tt) =>
    tt.toUpperCase()
  );

  const schema = z.object({
    name: z.string().min(1),
    address: z.string().min(1).optional(),
    type: z.enum(portalTypes as [string, ...string[]]),
    apiKey: z.string().optional(),
    zoneId: z.string().optional().nullable(),
  });

  const response = await schema.safeParseAsync(await request.json());
  if (!response.success) {
    return new CustomResponse()
      .status(400)
      .json({ error: "Invalid input", details: response.error.errors });
  }

  const { name, address, type: portalType, apiKey, zoneId } = response.data;

  const existingPortals = await prisma.portal.findMany({
    where: {
      id: { not: portalId },
      ownerId: user.companyId,
      status: { not: ResourceStatus.DELETED },
    },
  });

  if (
    existingPortals.some((p) => p.name.toLowerCase() === name.toLowerCase())
  ) {
    return new CustomResponse()
      .status(400)
      .json({ error: "This portal name already exists." });
  }

  const domainExists = existingPortals.some(
    (p) => p.address.toLowerCase() === address.toLowerCase()
  );

  if (domainExists) {
    return new CustomResponse()
      .status(400)
      .json({ error: "This domain already exists." });
  }

  const isAddressValid = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(address);
  if (!isAddressValid) {
    return new CustomResponse()
      .status(400)
      .json({ error: "Invalid domain format." });
  }

  const zoneIdUpdater =
    zoneId === null ? { disconnect: true } : { connect: { id: zoneId } };

  if (zoneId) {
    const zone = await prisma.zone.findUnique({
      where: { id: zoneId },
    });

    if (
      !zone ||
      !(await Security.hasUserCompanyAccess(user.id, zone.ownerId))
    ) {
      return new CustomResponse()
        .status(400)
        .json({ error: "Zone not found." });
    }

    if (
      existingPortal.zoneId !== zoneId &&
      existingPortal.transponders.length > 0
    ) {
      return new CustomResponse().status(400).json({
        error: "Cannot change zone ID when transponders are present.",
      });
    }
  } else if (existingPortal.zoneId && existingPortal.transponders.length > 0) {
    return new CustomResponse().status(400).json({
      error: "Cannot remove zone ID when transponders are present.",
    });
  }

  const portal = await prisma.portal.update({
    where: { id: portalId },
    data: {
      name,
      address,
      updatedBy: user.id,
      type: portalType as PortalType,
      apiKey,
      status: ResourceStatus.QUEUED,
      ...(zoneId !== undefined ? { zone: zoneIdUpdater } : {}),
    },
    include: { transponders: true },
  });

  const event = await EventHelper.createEvent(
    EventType.PORTAL_UPDATE,
    user.id,
    user.companyId
  );

  await EventHelper.addEventResource(event.id, "Portal", portal.id);

  if (
    existingPortal.address !== address ||
    existingPortal.type !== portalType ||
    existingPortal.apiKey !== apiKey
  ) {
    await EventHelper.addEventProperty(event.id, "FORCE_SYNC", "true");
  }

  delete portal.apiKey;

  return new CustomResponse().status(201).json(portal);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string }> }
): Promise<Response> {
  const user = await Security.getUser(request);

  if (!user) {
    return new CustomResponse()
      .status(401)
      .json({ error: "You must be logged in to perform this action." });
  }

  const { portalId } = await params;
  const existingPortal = await prisma.portal.findUnique({
    where: { id: portalId, status: { not: ResourceStatus.DELETED } },
    include: {
      transponders: { where: { status: { not: ResourceStatus.DELETED } } },
    },
  });

  if (
    !existingPortal ||
    !(await Security.hasUserCompanyAccess(user.id, existingPortal.ownerId))
  ) {
    return new CustomResponse()
      .status(404)
      .json({ error: "Portal not found." });
  }

  if (existingPortal.transponders.length > 0) {
    return new CustomResponse().status(400).json({
      error: "Cannot delete portal with existing transponders.",
    });
  }

  await prisma.portal.update({
    where: { id: portalId },
    data: {
      status: ResourceStatus.QUEUED,
      updatedBy: user.id,
    },
  });

  const event = await EventHelper.createEvent(
    EventType.PORTAL_DELETE,
    user.id,
    user.companyId
  );

  await EventHelper.addEventResource(event.id, "Portal", existingPortal.id);

  return new CustomResponse().status(204).end();
}
