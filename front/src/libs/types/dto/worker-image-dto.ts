import { WorkerImage } from "@prisma/client";

import { WorkerStorageTypeDTO } from "./worker-storage-type-dto";
import { WorkerDTO } from "./worker-dto";

export type WorkerImageDTO = Partial<WorkerImage> & {
  workerStorageType?: WorkerStorageTypeDTO;
  workers?: WorkerDTO[];
};
