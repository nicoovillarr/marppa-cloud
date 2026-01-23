import { Fiber } from "@prisma/client";
import { WorkerDTO } from "./worker-dto";
import { BitDTO } from "./bit-dto";

export type FiberDTO = Partial<Fiber> & {
  workers?: WorkerDTO[];
  bits?: BitDTO[];
};
