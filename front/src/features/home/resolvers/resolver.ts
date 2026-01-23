import { Resolver } from "@/core/resolvers/with-resolver";
import { UserDTO } from "@/types/dto/user-dto";

export type HomeResolveResult = {
  user: UserDTO;
};

export const resolve: Resolver<HomeResolveResult> = async ({
  user,
}) => {
  return {
    user,
  };
};

export default resolve;
