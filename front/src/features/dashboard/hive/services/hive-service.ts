import { HiveApiService } from "@/core/api-proxy/hive-api-service";
import { ApiResponse } from "@/types/api-response";

export class HiveService {
  private static hiveApiService = new HiveApiService();

  constructor() {}

  static createHive = (
    companyId: string,
    name: string,
    cpuCores: number,
    ramMB: number
  ): Promise<ApiResponse> => {
    return this.hiveApiService.createHive(companyId, name, cpuCores, ramMB);
  };

  static deleteWorkers = (workerIds: string[]): Promise<ApiResponse> => {
    return this.hiveApiService.deleteWorkers(workerIds);
  };
}
