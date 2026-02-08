import { Inject, Injectable } from "@nestjs/common";
import { WorkerDiskRepository, WORKER_DISK_REPOSITORY_SYMBOL } from "../repositories/worker-disk.repository";
import { WorkerDiskEntity } from "../entities/worker-disk.entity";
import { NotFoundError } from "@/shared/domain/errors/not-found.error";
import { CreateWorkerDiskDto } from "@/hive/presentation/dtos/create-worker-disk.dto";
import { UpdateWorkerDiskDto } from "@/hive/presentation/dtos/update-worker-disk.dto";
import { getCurrentUser } from "@/auth/infrastructure/als/session.context";

@Injectable()
export class WorkerDiskService {
  constructor(
    @Inject(WORKER_DISK_REPOSITORY_SYMBOL)
    private readonly workerDiskRepository: WorkerDiskRepository,
  ) { }

  async findById(id: number): Promise<WorkerDiskEntity> {
    const workerDisk = await this.workerDiskRepository.findById(id);
    if (!workerDisk) {
      throw new NotFoundError();
    }

    return workerDisk;
  }

  async findByOwnerId(ownerId: string): Promise<WorkerDiskEntity[]> {
    return this.workerDiskRepository.findByOwnerId(ownerId);
  }

  async create(data: CreateWorkerDiskDto): Promise<WorkerDiskEntity> {
    const user = getCurrentUser() ?? { userId: 'u-000001', companyId: 'c-000001' };
    
    const workerDisk = new WorkerDiskEntity(
      data.name,
      data.sizeGiB,
      data.hostPath,
      data.ownerId,
      data.storageTypeId,
      user.userId,
      {
        mountPoint: data.mountPoint,
        isBoot: data.isBoot,
        workerId: data.workerId ?? undefined,
      }
    );

    return this.save(workerDisk);
  }

  async update(id: number, data: UpdateWorkerDiskDto): Promise<WorkerDiskEntity> {
    const workerDisk = await this.findById(id);

    workerDisk.clone({
      name: data.name,
      sizeGiB: data.sizeGiB,
      hostPath: data.hostPath,
      ownerId: data.ownerId,
      storageTypeId: data.storageTypeId,
      mountPoint: data.mountPoint,
      isBoot: data.isBoot,
      workerId: data.workerId ?? undefined,
    });

    return this.save(workerDisk);
  }

  delete(id: number): Promise<void> {
    return this.workerDiskRepository.delete(id);
  }

  private save(data: WorkerDiskEntity): Promise<WorkerDiskEntity> {
    if (data.id == null) {
      return this.workerDiskRepository.create(data);
    }

    return this.workerDiskRepository.update(data);
  }
}