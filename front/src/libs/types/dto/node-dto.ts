import { Node } from "@prisma/client";

import { ZoneDTO } from "./zone-dto";
import { WorkerDTO } from "./worker-dto";
import { BitDTO } from "./bit-dto";
import { FiberDTO } from "./fiber-dto";

export type NodeDTO = Partial<Node> & {
  zone?: ZoneDTO;
  worker?: WorkerDTO;
  bit?: BitDTO;
  fibers?: FiberDTO[] | number;
};
