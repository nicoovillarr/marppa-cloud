import { CustomResponse } from "@/libs/custom-response";
import prisma from "@/libs/prisma";
import Security from "@/libs/security";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import z from "zod";

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");

  if (!sessionCookie) {
    return new CustomResponse().status(401).json({ error: "Unauthorized" });
  }

  const user = await Security.getUser();

  const schema = z.array(z.string());

  const response = await schema.safeParseAsync(await request.json());
  if (!response.success) {
    return new CustomResponse()
      .status(400)
      .json({ error: "Invalid input", details: response.error.errors });
  }

  const workerIds = response.data;

  const workers = await prisma.worker.findMany({
    where: {
      id: { in: workerIds },
    },
  });

  if (
    !Security.hasUserCompaniesAccess(
      user.companyId,
      workers.map((w) => w.ownerId)
    )
  ) {
    return new CustomResponse().status(403).json({ error: "Forbidden" });
  }

  await prisma.worker.deleteMany({
    where: {
      id: { in: workerIds },
    },
  });

  return new CustomResponse().status(204).end();
}
