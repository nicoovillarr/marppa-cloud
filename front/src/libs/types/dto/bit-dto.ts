import { Bit } from "@prisma/client";

import { CompanyDTO } from "./company-dto";
import { NodeDTO } from "./node-dto";

export type BitDTO = Partial<Bit> & {
  owner?: CompanyDTO;
  node?: NodeDTO;
};
