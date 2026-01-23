import { ApiProxyService } from "./api-proxy-service";

export class HiveApiService extends ApiProxyService {
  constructor() {
    super("hive");
  }

  readonly createHive = (
    companyId: string,
    name: string,
    cpuCores: number,
    ramMB: number
  ) => this.post("/", { companyId, name, cpuCores, ramMB });

  deleteWorkers = (workerIds: string[]) =>
    this.delete("/workers", workerIds);
}
