import { Resolver } from "@/core/presentation/resolvers/with-resolver";
import prisma from "@/libs/prisma";
import { UserDTO } from "@/libs/types/dto/user-dto";
import { WorkerDTO } from "@/libs/types/dto/worker-dto";
import { WorkerImageDTO } from "@/libs/types/dto/worker-image-dto";
import { WorkerMmiDTO } from "@/libs/types/dto/worker-mmi-dto";
import { ResourceStatus } from "@prisma/client";

export type HiveResolveResult = {
  user: UserDTO;
  workers: WorkerDTO[];
  workerImages?: WorkerImageDTO[];
  workerMmi?: WorkerMmiDTO[];
};

export const resolve: Resolver<HiveResolveResult> = async ({
  params,
  user,
}) => {
  const workers$ = prisma.worker.findMany({
    where: {
      ownerId: { in: user.companies || [] },
      status: { not: ResourceStatus.DELETED },
    },
    include: {
      node: true,
    },
  });

  const workerImages$ = prisma.workerImage.findMany();

  const workerMmi$ = prisma.workerMMI.findMany();

  const [workers, workerImages, workerMmi] = await Promise.all([
    workers$,
    workerImages$,
    workerMmi$,
  ]);

  return {
    user,
    workers,
    workerImages,
    workerMmi,
  };
};

export default resolve;
