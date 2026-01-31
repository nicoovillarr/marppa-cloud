import { WorkerDTO } from "@/libs/types/dto/worker-dto";
import { ApiProxyService } from "./api-proxy-service";

export class HiveApiService extends ApiProxyService {
  constructor() {
    super("hive");
  }

  readonly fetchWorkers = () => this.get("/workers");

  readonly createWorker = (
    companyId: string,
    name: string,
    workerMmiId: number,
    imageId: number,
    publicSshKey: string
  ) =>
    this.post("/workers", {
      companyId,
      name,
      workerMmiId,
      imageId,
      publicSshKey,
    });

  readonly updateWorker = (workerId: string, data: WorkerDTO) =>
    this.put(`/workers/${workerId}`, data);

  readonly deleteWorker = (workerId: string) =>
    this.delete(`/workers/${workerId}`);

  readonly startWorker = (workerId: string) =>
    this.post(`/workers/${workerId}/start`);

  readonly stopWorker = (workerId: string) =>
    this.post(`/workers/${workerId}/terminate`);
}
