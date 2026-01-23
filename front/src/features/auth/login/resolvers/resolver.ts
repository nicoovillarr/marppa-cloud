import { Resolver } from "@/core/resolvers/with-resolver";
import { UserDTO } from "@/types/dto/user-dto";
import { redirect } from "next/navigation";

export type LoginResolveResult = {
  user: UserDTO;
};

export const resolve: Resolver<LoginResolveResult> = async ({ user }) => {
  if (!!user) {
    redirect("/");
  }

  return {
    user,
  };
};

export default resolve;
