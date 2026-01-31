import { Container } from "@prisma/client";

import { UserDTO } from "./user-dto";

export type ChunkDTO = Partial<Container> & {
  owner?: UserDTO;
};
