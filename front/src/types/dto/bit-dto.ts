import { Bit } from "@prisma/client";
import { CompanyDTO } from "./company-dto";
import { FiberDTO } from "./fiber-dto";

export type BitDTO = Partial<Bit> & {
  owner?: CompanyDTO;
  fiber?: FiberDTO;
}