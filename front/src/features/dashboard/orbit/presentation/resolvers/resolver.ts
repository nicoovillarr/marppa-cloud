import "src/features/orbit/orbitFactory";

import { Resolver } from "@/core/presentation/resolvers/with-resolver";
import { PortalDTO } from "@/libs/types/dto/portal-dto";
import { UserDTO } from "@/libs/types/dto/user-dto";
import { PortalType } from "@prisma/client";
import OrbitService from "../services/orbitService";

export type HomeResolveResult = {
  user: UserDTO;
  portals: PortalDTO[];
  portalTypes: string[];
};

export const resolve: Resolver<HomeResolveResult> = async ({ user }) => {
  const portals$ = OrbitService.instance.getPortals();

  const [portals] = await Promise.all([portals$]);

  const portalTypes = Object.values(PortalType);

  return {
    user,
    portals,
    portalTypes,
  };
};

export default resolve;
