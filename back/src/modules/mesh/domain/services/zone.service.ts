import { Inject, Injectable } from "@nestjs/common";
import { ZONE_REPOSITORY_SYMBOL, ZoneRepository } from "../repositories/zone.repository";
import { ZoneEntity } from "../entities/zone.entity";
import { CreateZoneDto } from "../../presentation/dtos/create-zone.dto";
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { UnauthorizedError } from "@/shared/domain/errors/unauthorized.error";
import { ResourceStatus } from "@/shared/domain/enums/resource-status.enum";
import { UpdateZoneDto } from "../../presentation/dtos/update-zone.dto";
import { NotFoundError } from "@/shared/domain/errors/not-found.error";
import { ZoneWithNodesModel } from "../models/zone-with-nodes.model";

@Injectable()
export class ZoneService {
  constructor(
    @Inject(ZONE_REPOSITORY_SYMBOL)
    private readonly repository: ZoneRepository,
  ) { }

  public async findById(id: string): Promise<ZoneEntity> {
    const entity = await this.repository.findById(id);
    if (entity == null) {
      throw new NotFoundError();
    }

    return entity;
  }

  public async findWithNodesById(id: string): Promise<ZoneWithNodesModel> {
    const entity = await this.repository.findWithNodesById(id);
    if (entity == null) {
      throw new NotFoundError();
    }

    return entity;
  }

  public findByOwnerId(ownerId?: string): Promise<ZoneEntity[]> {
    if (ownerId == null) {
      const user = getCurrentUser();
      if (!user) {
        throw new UnauthorizedError();
      }

      ownerId = user.companyId;
    }

    return this.repository.findByOwnerId(ownerId);
  }

  public findLastZone(): Promise<ZoneWithNodesModel | null> {
    return this.repository.findLastZone();
  }

  public create(entity: CreateZoneDto, cidr: string, gateway: string): Promise<ZoneEntity> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const zone = new ZoneEntity(
      entity.name,
      ResourceStatus.ACTIVE,
      cidr,
      gateway,
      user.userId,
      user.companyId,
      {
        description: entity.description,
      }
    );

    return this.save(zone);
  }

  public async update(id: string, data: UpdateZoneDto): Promise<ZoneEntity> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const zone = await this.findById(id);

    const updated = zone.clone({
      name: data.name,
      description: data.description,
      updatedBy: user.userId,
    })

    return this.save(updated);
  }

  public delete(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  private save(entity: ZoneEntity): Promise<ZoneEntity> {
    if (entity.id == null) {
      return this.repository.create(entity);
    }

    return this.repository.update(entity);
  }
}