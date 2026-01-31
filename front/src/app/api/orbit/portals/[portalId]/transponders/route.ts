import { CustomResponse } from "@/libs/custom-response";
import { EventHelper } from "@/libs/event-helper";
import prisma from "@/libs/prisma";
import Security from "@/libs/security";
import { EventType, ResourceStatus, TransponderMode } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string }> }
) {
  const user = await Security.getUser(request);
  if (!user) {
    return new CustomResponse()
      .status(401)
      .json({ error: "You must be logged in to perform this action." });
  }

  const { portalId } = await params;
  const portal = await prisma.portal.findFirst({
    where: { id: portalId, status: { not: ResourceStatus.DELETED } },
    include: {
      transponders: {
        where: { status: { not: ResourceStatus.DELETED } },
        include: { node: true },
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

  return new CustomResponse().status(200).json(portal.transponders);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string }> }
) {
  const user = await Security.getUser(request);
  if (!user) {
    return new CustomResponse()
      .status(401)
      .json({ error: "You must be logged in to perform this action." });
  }

  const { portalId } = await params;
  const portal = await prisma.portal.findFirst({
    where: { id: portalId, status: { not: ResourceStatus.DELETED } },
    include: {
      transponders: { where: { status: { not: ResourceStatus.DELETED } } },
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

  const schema = z.object({
    path: z.string().min(1),
    mode: z.enum(
      Object.keys(TransponderMode) as [TransponderMode, ...TransponderMode[]]
    ),
    nodeId: z.string(),
    port: z.number().min(1).max(65535),
    priority: z.number().min(0).optional().default(1),
  });

  const response = await schema.safeParseAsync(await request.json());
  if (!response.success) {
    return new CustomResponse()
      .status(400)
      .json({ error: "Invalid request data.", details: response.error.errors });
  }

  const { path, mode, nodeId, port, priority } = response.data;

  const node = await prisma.node.findFirst({
    where: {
      id: nodeId,
      zoneId: portal.zoneId,
      status: { not: ResourceStatus.DELETED },
    },
  });

  if (!node) {
    return new CustomResponse()
      .status(400)
      .json({ error: "The specified node does not exist in this zone." });
  }

  if (node.status !== ResourceStatus.ACTIVE) {
    return new CustomResponse()
      .status(400)
      .json({ error: "The specified node is not active." });
  }

  if (
    portal.transponders.some((t) => t.path.toLowerCase() === path.toLowerCase())
  ) {
    return new CustomResponse().status(400).json({
      error: "A transponder with the same path  already exists.",
    });
  }

  const transponder = await prisma.transponder.create({
    data: {
      path,
      mode,
      nodeId,
      port,
      priority,
      portalId: portal.id,
      createdBy: user.id,
      updatedBy: user.id,
    },
  });

  const event = await EventHelper.createEvent(
    EventType.TRANSPONDER_CREATE,
    user.id,
    user.companyId
  );

  await EventHelper.addEventResource(event.id, "Transponder", transponder.id);
  await EventHelper.addEventResource(event.id, "Node", node.id);

  return new CustomResponse().status(201).json(transponder);
}
