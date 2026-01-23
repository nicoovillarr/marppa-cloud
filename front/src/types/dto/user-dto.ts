import { User } from "@prisma/client";
import { CompanyDTO } from "./company-dto";
import { SessionDTO } from "./session-dto";

export type UserDTO = Partial<User> & {
  company?: CompanyDTO;
  sessions?: SessionDTO[];
};
