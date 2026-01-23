import { Resolver } from "@/core/resolvers/with-resolver";
import prisma from "@/libs/prisma";
import { ChunkDTO } from "@/types/dto/chunk-dto";
import { UserDTO } from "@/types/dto/user-dto";

export type HomeResolveResult = {
  user: UserDTO;
  containers: ChunkDTO[];
};

export const resolve: Resolver<HomeResolveResult> = async ({
  params,
  user,
}) => {
  const containers = await prisma.container.findMany();

  return {
    user,
    containers,
  };
};

export default resolve;
