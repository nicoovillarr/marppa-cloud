import { UserDTO } from "@/types/dto/user-dto";
import { Resolver } from "./with-resolver";
import prisma from "@/libs/prisma";
import Security from "@/libs/security";

export type ResolveResult = {
  user: UserDTO;
};

export const resolve: Resolver<ResolveResult> = async () => {
  const jwt = await Security.getJwt();
  const userId = jwt?.userId;

  let user: UserDTO | null = null;
  if (userId) {
    user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
      },
    });
  }

  return { user };
};
