// api/hive

import { CustomResponse } from "@/libs/custom-response";
import prisma from "@/libs/prisma";
import Security from "@/libs/security";
import { cookies } from "next/headers";
import { z } from "zod";

import "@/libs/extensions/string-extension";

export async function POST(request: Request): Promise<Response> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");

  if (!sessionCookie) {
    return new CustomResponse().status(401).json({ error: "Unauthorized" });
  }

  const user = await Security.getUser();

  const schema = z.object({
    companyId: z.string(),
    name: z
      .string()
      .min(1, "Name is required")
      .transform((val) => val.sanitize()),
    cpuCores: z.number().int().min(1, "CPU cores must be at least 1"),
    ramMB: z.number().int().min(512, "RAM must be at least 512 MB"),
  });

  const response = await schema.safeParseAsync(await request.json());
  if (!response.success) {
    return new CustomResponse()
      .status(400)
      .json({ error: "Invalid input", details: response.error.errors });
  }

  const { companyId, name, cpuCores, ramMB } = response.data;

  if (!Security.hasUserCompanyAccess(user.companyId, companyId)) {
    return new CustomResponse().status(403).json({ error: "Forbidden" });
  }

  const worker = await prisma.worker.create({
    data: {
      name,
      cpuCores,
      ramMB,
      diskGB: 10,
      status: "CREATING",
      createdBy: user.id,
      updatedBy: user.id,
      owner: {
        connect: { id: companyId },
      },
    },
  });

  return new CustomResponse().status(201).json(worker);
}
