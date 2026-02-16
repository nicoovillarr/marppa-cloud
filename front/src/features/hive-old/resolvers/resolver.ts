import { Resolver } from "@/core/resolvers/with-resolver";
import prisma from "@/libs/prisma";
import { UserDTO } from "@/types/dto/user-dto";
import { WorkerDTO } from "@/types/dto/worker-dto";
import { ZoneDTO } from "@/types/dto/zone-dto";

export type HiveResolveResult = {
  user: UserDTO;
  zones: ZoneDTO[];
  workers: WorkerDTO[];
};

export const resolve: Resolver<HiveResolveResult> = async ({
  params,
  user,
}) => {
  const zones = await prisma.zone.findMany();
  const workers = await prisma.worker.findMany();

  return {
    user,
    zones,
    workers,
  };
};

export default resolve;
