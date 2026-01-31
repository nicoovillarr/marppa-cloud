import "@/dashboard/mesh/meshFactory";

import { Resolver } from "@/core/presentation/resolvers/with-resolver";
import prisma from "@/libs/prisma";
import { ZoneDTO } from "@/libs/types/dto/zone-dto";

export type HomeResolveResult = {
  zones: ZoneDTO[];
};

export const resolve: Resolver<HomeResolveResult> = async () => {
  const zones$ = prisma.zone.findMany({
    include: {
      nodes: {
        include: {
          fibers: true,
        },
      },
    },
  });

  const [zones] = await Promise.all([zones$]);

  return {
    zones: zones.map((zone) => ({
      ...zone,
      nodes: zone.nodes.map((node) => ({
        ...node,
        fibers: node.fibers.length,
      })),
    })),
  };
};

export default resolve;
