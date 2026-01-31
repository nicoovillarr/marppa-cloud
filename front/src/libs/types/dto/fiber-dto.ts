import { Fiber } from "@prisma/client";
import { NodeDTO } from "./node-dto";

export type FiberDTO = Partial<Fiber> & {
  node?: NodeDTO;
};
