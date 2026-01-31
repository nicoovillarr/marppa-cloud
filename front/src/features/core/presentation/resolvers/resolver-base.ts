import { UserDTO } from "@/libs/types/dto/user-dto";
import { Resolver } from "./with-resolver";
import prisma from "@/libs/prisma";
import Security from "@/libs/security";

export type ResolveResult = {
  user: UserDTO;
};

export const resolve: Resolver<ResolveResult> = async () => {
  let userDto: UserDTO | null = null;
  let companies: string[] = [];

  const jwt = await Security.getJwt();
  if (jwt?.exp && Date.now() < jwt.exp * 1000) {
    const userId = jwt?.userId;

    if (userId) {
      userDto = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          company: true,
        },
      });

      companies = await Security.getUserCompanies(userDto.companyId);
    }
  }

  return { user: userDto ? { ...userDto, companies } : null };
};
