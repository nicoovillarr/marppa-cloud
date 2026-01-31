import { Resolver } from "@/core/presentation/resolvers/with-resolver";
import prisma from "@/libs/prisma";
import { UserDTO } from "@/libs/types/dto/user-dto";
import { ZoneDTO } from "@/libs/types/dto/zone-dto";

export type HomeResolveResult = {
  user: UserDTO;
  zones: ZoneDTO[];
};

export const resolve: Resolver<HomeResolveResult> = async ({
  params,
  user,
}) => {
  const zones = await prisma.zone.findMany({
    include: {
      nodes: true,
    },
  });

  return {
    user,
    zones,
  };
};

export default resolve;
