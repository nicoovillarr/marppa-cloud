import { CustomResponse } from "@/libs/custom-response";
import prisma from "@/libs/prisma";
import Security from "@/libs/security";
import { ResourceStatus } from "@prisma/client";
import { NextRequest } from "next/server";

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

  const { ownerId } = await prisma.zone.findUnique({
    where: { id: zoneId },
    select: { ownerId: true },
  });

  if (!ownerId || !(await Security.hasUserCompanyAccess(user.id, ownerId))) {
    return new CustomResponse().status(403).json({
      message: "Forbidden",
    });
  }

  const node = await prisma.node.findUnique({
    where: { id: nodeId, zoneId, status: { not: ResourceStatus.DELETED } },
    include: {
      fibers: true,
    },
  });

  return new CustomResponse().status(200).json(node);
}
