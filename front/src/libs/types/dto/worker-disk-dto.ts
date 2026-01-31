import { WorkerDisk } from "@prisma/client";

import { CompanyDTO } from "./company-dto";
import { WorkerStorageTypeDTO } from "./worker-storage-type-dto";
import { WorkerDTO } from "./worker-dto";

export type WorkerDiskDTO = Partial<WorkerDisk> & {
  owner?: CompanyDTO;
  storageType?: WorkerStorageTypeDTO;
  worker?: WorkerDTO;
};
