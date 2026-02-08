import { Inject, Injectable } from "@nestjs/common";
import { WorkerFamilyRepository } from "../repositories/worker-family.repository";
import { WorkerFamilyEntity } from "../entities/worker-family.entity";
import { NotFoundError } from "@/shared/domain/errors/not-found.error";
import { CreateWorkerFamilyDto } from "@/hive/presentation/dtos/create-worker-family.dto";
import { UpdateWorkerFamilyDto } from "@/hive/presentation/dtos/update-worker-family.dto";
import { WORKER_FAMILY_REPOSITORY_SYMBOL } from "../repositories/worker-family.repository";

@Injectable()
export class WorkerFamilyService {
  constructor(
    @Inject(WORKER_FAMILY_REPOSITORY_SYMBOL)
    private readonly workerFamilyRepository: WorkerFamilyRepository,
  ) { }

  async findById(id: number): Promise<WorkerFamilyEntity> {
    const workerFamily = await this.workerFamilyRepository.findById(id);
    if (!workerFamily) {
      throw new NotFoundError();
    }

    return workerFamily;
  }

  async create(data: CreateWorkerFamilyDto): Promise<WorkerFamilyEntity> {
    const entity = new WorkerFamilyEntity(
      data.name,
      {
        description: data.description,
      }
    );

    return this.save(entity);
  }

  async update(id: number, data: UpdateWorkerFamilyDto): Promise<WorkerFamilyEntity> {
    const entity = await this.findById(id);
    const updated = entity.clone({
      name: data.name,
      description: data.description,
    });

    return this.save(updated);
  }

  delete(id: number): Promise<void> {
    return this.workerFamilyRepository.delete(id);
  }

  private save(entity: WorkerFamilyEntity): Promise<WorkerFamilyEntity> {
    if (entity.id == null) {
      return this.workerFamilyRepository.create(entity);
    }

    return this.workerFamilyRepository.update(entity);
  }
}
