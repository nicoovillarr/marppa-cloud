import { WorkerStorageType } from "@prisma/client";

import { WorkerDiskDTO } from "./worker-disk-dto";
import { WorkerImageDTO } from "./worker-image-dto";

export type WorkerStorageTypeDTO = Partial<WorkerStorageType> & {
  storages?: WorkerDiskDTO[];
  workerImages?: WorkerImageDTO[];
};
