import { WorkerDiskRepository } from "../repositories/worker-disk.repository";
import { WorkerImageRepository } from "../repositories/worker-image.repository";
import { WorkerMmiFamilyRepository } from "../repositories/worker-mmi-family.entity";
import { WorkerMmiRepository } from "../repositories/worker-mmi.repository";
import { WorkerRepository } from "../repositories/worker.repository";
import { WorkerStorageTypeRepository } from "../repositories/worker-storage-type.repository";
import { WorkerEntity } from "../entities/worker.entity";

export class WorkerService {
  constructor(
    private readonly workerRepository: WorkerRepository,
    private readonly workerImageRepository: WorkerImageRepository,
    private readonly workerMmiRepository: WorkerMmiRepository,
    private readonly workerMmiFamilyRepository: WorkerMmiFamilyRepository,
    private readonly workerStorageTypeRepository: WorkerStorageTypeRepository,
    private readonly workerDiskRepository: WorkerDiskRepository,
  ) { }

  async createWorker(worker: WorkerEntity): Promise<WorkerEntity> {
    return this.workerRepository.create(worker);
  }

  async updateWorker(worker: WorkerEntity): Promise<WorkerEntity> {
    return this.workerRepository.update(worker);
  }

  async deleteWorker(worker: WorkerEntity): Promise<void> {
    return this.workerRepository.delete(worker);
  }

  async findById(id: string): Promise<WorkerEntity | null> {
    return this.workerRepository.findById(id);
  }

  async findByOwnerId(ownerId: string): Promise<WorkerEntity[]> {
    return this.workerRepository.findByOwnerId(ownerId);
  }
}