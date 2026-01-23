import { Worker } from "@prisma/client";
import { CompanyDTO } from "./company-dto";
import { FiberDTO } from "./fiber-dto";

export type WorkerDTO = Partial<Worker> & {
  owner?: CompanyDTO;
  fiber?: FiberDTO;
};
