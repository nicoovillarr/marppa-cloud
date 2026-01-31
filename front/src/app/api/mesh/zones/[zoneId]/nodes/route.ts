import { CustomResponse } from "@/libs/custom-response";
import prisma from "@/libs/prisma";
import Security from "@/libs/security";
import { ResourceStatus } from "@prisma/client";
import { NextRequest } from "next/server";

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

  const { ownerId } = await prisma.zone.findUnique({
    where: { id: zoneId },
    select: { ownerId: true },
  });

  if (!ownerId || !(await Security.hasUserCompanyAccess(user.id, ownerId))) {
    return new CustomResponse().status(403).json({
      message: "Forbidden",
    });
  }

  const nodes = await prisma.node.findMany({
    where: { zoneId: zoneId, status: { not: ResourceStatus.DELETED } },
    include: {
      worker: true,
      atom: true,
      fibers: true,  
    },
  });

  return new CustomResponse().status(200).json(nodes);
}
