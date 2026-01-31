import { Transponder } from "@prisma/client";
import { PortalDTO } from "./portal-dto";
import { NodeDTO } from "./node-dto";

export type TransponderDTO = Partial<Transponder> & {
  portal?: PortalDTO;
  node?: NodeDTO;
};
