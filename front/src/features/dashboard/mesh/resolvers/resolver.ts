import { Resolver } from "@/core/resolvers/with-resolver";
import prisma from "@/libs/prisma";
import { UserDTO } from "@/types/dto/user-dto";
import { ZoneDTO } from "@/types/dto/zone-dto";

export type HomeResolveResult = {
  user: UserDTO;
  vpcs: ZoneDTO[];
};

export const resolve: Resolver<HomeResolveResult> = async ({
  params,
  user,
}) => {
  const vpcs = await prisma.vPC.findMany();

  return {
    user,
    vpcs,
  };
};

export default resolve;
