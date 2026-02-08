import { WORKER_REPOSITORY_SYMBOL, WorkerRepository } from "../repositories/worker.repository";
import { WorkerEntity } from "../entities/worker.entity";
import { NotFoundError } from "@/shared/domain/errors/not-found.error";
import { UpdateWorkerDto } from "@/hive/presentation/dtos/update-worker.dto";
import { CreateWorkerDto } from "@/hive/presentation/dtos/create-worker.dto";
import { getCurrentUser } from "@/auth/infrastructure/als/session.context";
import { ResourceStatus } from "@/shared/domain/enums/resource-status.enum";
import { Inject, Injectable } from "@nestjs/common";
import { UnauthorizedError } from "@/shared/domain/errors/unauthorized.error";

@Injectable()
export class WorkerService {
  constructor(
    @Inject(WORKER_REPOSITORY_SYMBOL)
    private readonly workerRepository: WorkerRepository,
  ) { }

  async findById(id: string): Promise<WorkerEntity> {
    const worker = await this.workerRepository.findById(id);
    if (!worker) {
      throw new NotFoundError();
    }

    return worker;
  }

  async findByOwnerId(ownerId: string): Promise<WorkerEntity[]> {
    return this.workerRepository.findByOwnerId(ownerId);
  }

  async createWorker(data: CreateWorkerDto): Promise<WorkerEntity> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const entity = new WorkerEntity(
      data.name,
      ResourceStatus.INACTIVE,
      data.macAddress,
      user.userId,
      data.imageId,
      data.flavorId,
      data.ownerId ?? user.companyId,
    );

    return this.save(entity);
  }

  async updateWorker(id: string, data: UpdateWorkerDto): Promise<WorkerEntity> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const entity = await this.findById(id);
    const updated = entity.clone({
      name: data.name,
      macAddress: data.macAddress,
      updatedBy: user.userId,
      imageId: data.imageId,
      flavorId: data.flavorId,
    });

    return this.save(updated);
  }

  deleteWorker(id: string): Promise<void> {
    return this.workerRepository.delete(id);
  }

  private save(data: WorkerEntity): Promise<WorkerEntity> {
    if (data.id == null) {
      return this.workerRepository.create(data);
    }

    return this.workerRepository.update(data);
  }
}