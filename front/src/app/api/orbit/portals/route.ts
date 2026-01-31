import { CustomResponse } from "@/libs/custom-response";
import { EventHelper } from "@/libs/event-helper";
import prisma from "@/libs/prisma";
import Security from "@/libs/security";
import { EventType, PortalType, ResourceStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import z from "zod";

export async function GET(request: NextRequest): Promise<Response> {
  const user = await Security.getUser(request);
  if (!user) {
    return new CustomResponse()
      .status(401)
      .json({ error: "You must be logged in to perform this action." });
  }

  const userCompanies = await Security.getUserCompanies(user.companyId);

  const portals = await prisma.portal.findMany({
    where: {
      ownerId: { in: userCompanies },
      status: { not: ResourceStatus.DELETED },
    },
  });

  portals.forEach((portal) => {
    delete portal.apiKey;
  });

  return new CustomResponse().status(200).json(portals);
}

export async function POST(request: NextRequest): Promise<Response> {
  const user = await Security.getUser(request);

  if (!user) {
    return new CustomResponse()
      .status(401)
      .json({ error: "You must be logged in to perform this action." });
  }

  const portalTypes: string[] = Object.keys(PortalType).map((tt) =>
    tt.toUpperCase()
  );

  const schema = z.object({
    companyId: z.string().default(user.companyId),
    name: z.string().min(1),
    description: z.string().max(255).optional(),
    address: z.string().min(1),
    type: z.enum(portalTypes as [string, ...string[]]),
    apiKey: z.string().min(1),
  });

  const response = await schema.safeParseAsync(await request.json());
  if (!response.success) {
    return new CustomResponse()
      .status(400)
      .json({ error: "Invalid input", details: response.error.errors });
  }

  const {
    companyId,
    name,
    description,
    address,
    type: portalType,
    apiKey,
  } = response.data;

  if (!name || name.trim() === "") {
    return new CustomResponse()
      .status(400)
      .json({ error: "Portal Name is required." });
  }

  const existingPortals = await prisma.portal.findMany({
    where: { ownerId: companyId, status: { not: ResourceStatus.DELETED } },
  });

  if (
    existingPortals.some((p) => p.name.toLowerCase() === name.toLowerCase())
  ) {
    return new CustomResponse()
      .status(400)
      .json({ error: "This portal name already exists." });
  }

  if (!address) {
    return new CustomResponse()
      .status(400)
      .json({ error: "Address is required." });
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

  if (!portalType) {
    return new CustomResponse()
      .status(400)
      .json({ error: "Please select a DDNS provider." });
  }

  if (!apiKey || apiKey.trim() === "") {
    return new CustomResponse()
      .status(400)
      .json({ error: "API Key is required." });
  }

  const portal = await prisma.portal.create({
    data: {
      name,
      description,
      address,
      type: portalType as PortalType,
      apiKey,
      createdBy: user.id,
      updatedBy: user.id,
      owner: {
        connect: { id: companyId },
      },
    },
  });

  delete portal.apiKey;

  const event = await EventHelper.createEvent(
    EventType.PORTAL_CREATE,
    user.id,
    user.companyId
  );

  await EventHelper.addEventResource(event.id, "Portal", portal.id);

  return new CustomResponse().status(201).json({ portal });
}
