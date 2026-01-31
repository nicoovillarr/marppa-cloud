import { WorkerMMI } from "@prisma/client";

import { WorkerDTO } from "./worker-dto";
import { WorkerMmiFamilyDTO } from "./worker-mmi-family-dto";

export type WorkerMmiDTO = Partial<WorkerMMI> & {
  displayName?: string;
  workers?: WorkerDTO[];
  family?: WorkerMmiFamilyDTO;
};
