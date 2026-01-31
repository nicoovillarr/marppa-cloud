import { Resolver } from "@/core/presentation/resolvers/with-resolver";
import prisma from "@/libs/prisma";
import { PortalDTO } from "@/libs/types/dto/portal-dto";
import { UserDTO } from "@/libs/types/dto/user-dto";
import { PortalType } from "@prisma/client";

export type HomeResolveResult = {
  user: UserDTO;
  portals: PortalDTO[];
  portalTypes: string[];
};

export const resolve: Resolver<HomeResolveResult> = async ({
  params,
  user,
}) => {
  const portals = await prisma.portal.findMany();
  const portalTypes = Object.values(PortalType);

  return {
    user,
    portals,
    portalTypes,
  };
};

export default resolve;
