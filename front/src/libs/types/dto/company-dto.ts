import { Company } from "@prisma/client";

import { UserDTO } from "./user-dto";
import { WorkerDTO } from "./worker-dto";
import { ZoneDTO } from "./zone-dto";
import { BitDTO } from "./bit-dto";
import { WorkerDiskDTO } from "./worker-disk-dto";
import { EventDTO } from "./event-dto";

export type CompanyDTO = Partial<Company> & {
  users?: UserDTO[];
  workers?: WorkerDTO[];
  zones?: ZoneDTO[];
  bits?: BitDTO[];
  storages?: WorkerDiskDTO[];
  children?: CompanyDTO[];
  parentCompany?: CompanyDTO;
  events?: EventDTO[];
};
