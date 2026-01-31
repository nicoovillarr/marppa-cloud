import { CompanyDTO } from "./company-dto";
import { Portal } from "@prisma/client";
import { TransponderDTO } from "./transponder-dto";
import { ZoneDTO } from "./zone-dto";

export type PortalDTO = Partial<Portal> & {
  zone?: ZoneDTO;
  owner?: CompanyDTO;
  transponders?: TransponderDTO[];
};
