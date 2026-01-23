import { Company } from "@prisma/client";
import { UserDTO } from "./user-dto";
import { WorkerDTO } from "./worker-dto";
import { ZoneDTO } from "./zone-dto";
import { BitDTO } from "./bit-dto";

export type CompanyDTO = Partial<Company> & {
  users?: UserDTO[];
  workers?: WorkerDTO[];
  zones?: ZoneDTO[];
  bits?: BitDTO[];
};
