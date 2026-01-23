import { Session } from "@prisma/client";
import { UserDTO } from "./user-dto";

export type SessionDTO = Partial<Session> & {
  user?: UserDTO;
};
