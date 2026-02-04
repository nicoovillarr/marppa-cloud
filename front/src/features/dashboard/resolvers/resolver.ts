import { Resolver } from "@/core/resolvers/with-resolver";
import prisma from "@/libs/prisma";
import { ChunkDTO } from "@/types/dto/chunk-dto";
import { UserDTO } from "@/types/dto/user-dto";
import { WorkerDTO } from "@/types/dto/worker-dto";
import { ZoneDTO } from "@/types/dto/zone-dto";

export type DashboardResolveResult = {
  user: UserDTO;
  zones: ZoneDTO[];
  workers: WorkerDTO[];
  bits: ChunkDTO[];
};

export const resolve: Resolver<DashboardResolveResult> = async ({ params, user }) => {
  const zones = await prisma.zone.findMany();
  const workers = await prisma.worker.findMany();

  return {
    user,
    zones,
    workers,
    bits: [],
  };
};

export default resolve;
