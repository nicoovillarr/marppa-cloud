import { HiveApiService } from "@/core/data/api-proxy/hive-api-service";
import HiveRepository from "../../domain/repositories/hiveRepository";
import { WorkerDTO } from "@/libs/types/dto/worker-dto";

export default class HiveRepositoryImpl implements HiveRepository {
  protected apiService: HiveApiService;

  constructor() {
    this.apiService = new HiveApiService();
  }

  public fetchWorkers = async (): Promise<WorkerDTO[]> => {
    const { success, data } = await this.apiService.fetchWorkers();

    if (!success) {
      throw new Error(data);
    }

    return data;
  };

  createWorker = async (
    companyId: string,
    name: string,
    workerMmiId: number,
    imageId: number,
    publicSshKey: string
  ) => {
    const { success, data } = await this.apiService.createWorker(
      companyId,
      name,
      workerMmiId,
      imageId,
      publicSshKey
    );

    if (!success) {
      throw new Error(data);
    }

    return data;
  };

  deleteWorker = async (workerId: string) => {
    const { success, data } = await this.apiService.deleteWorker(workerId);

    if (!success) {
      throw new Error(data);
    }

    return data;
  };

  updateWorker = async (workerId: string, data: WorkerDTO) => {
    const { success, data: responseData } = await this.apiService.updateWorker(
      workerId,
      data
    );

    if (!success) {
      throw new Error(responseData);
    }

    return responseData;
  };

  startWorker = async (workerId: string) => {
    const { success, data } = await this.apiService.startWorker(workerId);

    if (!success) {
      throw new Error(data);
    }

    return data;
  };

  stopWorker = async (workerId: string) => {
    const { success, data } = await this.apiService.stopWorker(workerId);

    if (!success) {
      throw new Error(data);
    }

    return data;
  };
}
