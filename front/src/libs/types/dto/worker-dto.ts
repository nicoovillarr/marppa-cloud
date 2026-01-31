import { Worker } from "@prisma/client";

import { CompanyDTO } from "./company-dto";
import { NodeDTO } from "./node-dto";
import { WorkerImageDTO } from "./worker-image-dto";
import { WorkerStorageTypeDTO } from "./worker-storage-type-dto";
import { WorkerMmiDTO } from "./worker-mmi-dto";

export type WorkerDTO = Partial<Worker> & {
  owner?: CompanyDTO;
  node?: NodeDTO;
  image?: WorkerImageDTO;
  storages?: WorkerStorageTypeDTO[];
  instanceType?: WorkerMmiDTO;
};
