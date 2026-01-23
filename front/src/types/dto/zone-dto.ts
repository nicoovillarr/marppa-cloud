import { NodeDTO } from "./node-dto";
import { CompanyDTO } from "./company-dto";
import { Zone } from "@prisma/client";

export type ZoneDTO = Partial<Zone> & {
  owner?: CompanyDTO;
  nodes?: NodeDTO[];
};
