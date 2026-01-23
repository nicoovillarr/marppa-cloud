import { Node } from "@prisma/client";
import { ZoneDTO } from "./zone-dto";
import { FiberDTO } from "./fiber-dto";

export type NodeDTO = Partial<Node> & {
  zone?: ZoneDTO;
  fibers?: FiberDTO[];
}