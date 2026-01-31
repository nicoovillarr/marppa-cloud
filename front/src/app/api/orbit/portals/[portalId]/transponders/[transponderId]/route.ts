import { CustomResponse } from "@/libs/custom-response";
import { EventHelper } from "@/libs/event-helper";
import prisma from "@/libs/prisma";
import Security from "@/libs/security";
import { EventType, ResourceStatus, TransponderMode } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string; transponderId: string }> }
) {
  const user = await Security.getUser(request);
  if (!user) {
    return new CustomResponse()
      .status(401)
      .json({ error: "You must be logged in to perform this action." });
  }

  const { portalId, transponderId } = await params;
  const { ownerId } = await prisma.portal.findFirst({
    where: { id: portalId, status: { not: ResourceStatus.DELETED } },
  });

  if (!ownerId || !(await Security.hasUserCompanyAccess(user.id, ownerId))) {
    return new CustomResponse()
      .status(404)
      .json({ error: "Portal not found." });
  }

  const transponder = await prisma.transponder.findFirst({
    where: {
      id: transponderId,
      portalId: portalId,
      status: { not: ResourceStatus.DELETED },
    },
    include: { node: true, portal: true },
  });

  if (!transponder) {
    return new CustomResponse()
      .status(404)
      .json({ error: "Transponder not found in this portal." });
  }

  return new CustomResponse().status(200).json(transponder);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string; transponderId: string }> }
) {
  const user = await Security.getUser(request);
  if (!user) {
    return new CustomResponse()
      .status(401)
      .json({ error: "You must be logged in to perform this action." });
  }

  const { portalId, transponderId } = await params;
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

  const existingTransponder = portal.transponders.find(
    (t) => t.id === transponderId
  );

  if (
    !existingTransponder ||
    existingTransponder.status === ResourceStatus.DELETED
  ) {
    return new CustomResponse()
      .status(404)
      .json({ error: "Transponder not found in this portal." });
  }

  if (portal.status !== "ACTIVE") {
    return new CustomResponse()
      .status(400)
      .json({ error: "Cannot modify transponders of an inactive portal." });
  }

  if (existingTransponder.status !== ResourceStatus.ACTIVE) {
    return new CustomResponse()
      .status(400)
      .json({ error: "Cannot modify a transponder that is not active." });
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
    where: { id: nodeId, zoneId: portal.zoneId },
  });

  if (!node) {
    return new CustomResponse()
      .status(400)
      .json({ error: "The specified node does not exist in this zone." });
  }

  if (
    portal.transponders.some(
      (t) =>
        t.path.toLowerCase() === path.toLowerCase() && t.id !== transponderId
    )
  ) {
    return new CustomResponse().status(400).json({
      error: "A transponder with the same path already exists.",
    });
  }

  const transponder = await prisma.transponder.update({
    where: { id: transponderId },
    data: {
      path,
      mode,
      nodeId,
      port,
      priority,
      status: ResourceStatus.QUEUED,
      updatedBy: user.id,
    },
  });

  const event = await EventHelper.createEvent(
    EventType.TRANSPONDER_UPDATE,
    user.id,
    user.companyId
  );

  await EventHelper.addEventResource(event.id, "Transponder", transponder.id);

  return new CustomResponse().status(200).json(transponder);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string; transponderId: string }> }
) {
  const user = await Security.getUser(request);
  if (!user) {
    return new CustomResponse()
      .status(401)
      .json({ error: "You must be logged in to perform this action." });
  }

  const { portalId, transponderId } = await params;
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

  const existingTransponder = portal.transponders.find(
    (t) => t.id === transponderId
  );

  if (!existingTransponder) {
    return new CustomResponse()
      .status(404)
      .json({ error: "Transponder not found in this portal." });
  }

  if (portal.status !== "ACTIVE") {
    return new CustomResponse()
      .status(400)
      .json({ error: "Cannot modify transponders of an inactive portal." });
  }

  if (existingTransponder.status !== ResourceStatus.ACTIVE) {
    return new CustomResponse()
      .status(400)
      .json({ error: "Cannot delete a transponder that is not active." });
  }

  await prisma.transponder.update({
    where: { id: transponderId },
    data: { status: ResourceStatus.QUEUED, updatedBy: user.id },
  });

  const event = await EventHelper.createEvent(
    EventType.TRANSPONDER_DELETE,
    user.id,
    user.companyId
  );

  await EventHelper.addEventResource(event.id, "Transponder", transponderId);

  return new CustomResponse().status(204).end();
}
