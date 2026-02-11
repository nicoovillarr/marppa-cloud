import { WORKER_REPOSITORY_SYMBOL, WorkerRepository } from "../repositories/worker.repository";
import { WorkerEntity } from "../entities/worker.entity";
import { NotFoundError } from "@/shared/domain/errors/not-found.error";
import { UpdateWorkerDto } from "@/hive/presentation/dtos/update-worker.dto";
import { CreateWorkerDto } from "@/hive/presentation/dtos/create-worker.dto";
import { getCurrentUser } from "@/auth/infrastructure/als/session.context";
import { ResourceStatus } from "@/shared/domain/enums/resource-status.enum";
import { Inject, Injectable } from "@nestjs/common";
import { UnauthorizedError } from "@/shared/domain/errors/unauthorized.error";
import { MacAddressService } from "./mac-address.service";
import { WorkerInvalidStatusError } from "../errors/worker-invalid-status.error";

@Injectable()
export class WorkerService {
  constructor(
    @Inject(WORKER_REPOSITORY_SYMBOL)
    private readonly workerRepository: WorkerRepository,

    private readonly macAddressService: MacAddressService,
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

    const macAddress = this.macAddressService.generate();

    const entity = new WorkerEntity(
      data.name,
      ResourceStatus.PROVISIONING,
      macAddress,
      user.userId,
      data.imageId,
      data.flavorId,
      data.ownerId ?? user.companyId,
    );

    return this.save(entity);
  }

  async startWorker(id: string): Promise<void> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const entity = await this.findById(id);

    if (entity.status !== ResourceStatus.INACTIVE) {
      throw new WorkerInvalidStatusError(ResourceStatus.INACTIVE, entity.status);
    }

    const updated = entity.clone({
      status: ResourceStatus.QUEUED,
      updatedBy: user.userId,
    });

    await this.save(updated);
  }

  async stopWorker(id: string): Promise<void> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const entity = await this.findById(id);

    if (entity.status !== ResourceStatus.ACTIVE) {
      throw new WorkerInvalidStatusError(ResourceStatus.ACTIVE, entity.status);
    }

    const updated = entity.clone({
      status: ResourceStatus.STOPPING,
      updatedBy: user.userId,
    });

    await this.save(updated);
  }

  async updateWorker(id: string, data: UpdateWorkerDto): Promise<WorkerEntity> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const entity = await this.findById(id);
    const updated = entity.clone({
      name: data.name,
      updatedBy: user.userId,
    });

    return this.save(updated);
  }

  async deleteWorker(id: string): Promise<void> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const entity = await this.findById(id);

    if (entity.status !== ResourceStatus.INACTIVE) {
      throw new WorkerInvalidStatusError(ResourceStatus.INACTIVE, entity.status);
    }

    const updated = entity.clone({
      status: ResourceStatus.DELETING,
      updatedBy: user.userId,
    });

    await this.save(updated);
  }

  private save(data: WorkerEntity): Promise<WorkerEntity> {
    if (data.id == null) {
      return this.workerRepository.create(data);
    }

    return this.workerRepository.update(data);
  }
}