import { WorkerDTO } from "@/libs/types/dto/worker-dto";

export default interface HiveRepository {
  fetchWorkers: () => Promise<WorkerDTO[]>;

  createWorker: (
    companyId: string,
    name: string,
    workerMmiId: number,
    imageId: number,
    publicSshKey: string
  ) => Promise<WorkerDTO>;

  updateWorker: (workerId: string, data: WorkerDTO) => Promise<WorkerDTO>;

  deleteWorker: (workerId: string) => Promise<void>;

  startWorker: (workerId: string) => Promise<void>;

  stopWorker: (workerId: string) => Promise<void>;
}
