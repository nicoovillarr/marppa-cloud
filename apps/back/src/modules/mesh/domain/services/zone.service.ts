import { Inject, Injectable } from '@nestjs/common';
import {
  ZONE_REPOSITORY_SYMBOL,
  ZoneRepository,
} from '../repositories/zone.repository';
import { ZoneEntity } from '../entities/zone.entity';
import { CreateZoneDto } from '../../presentation/dtos/create-zone.dto';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { EventTypeKey, getEventStateTransition } from '@marppa-cloud/api-types';
import { UpdateZoneDto } from '../../presentation/dtos/update-zone.dto';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { ZoneWithNodesModel } from '../models/zone-with-nodes.model';
import { ZoneWithNodesAndFibersModel } from '../models/zone-with-nodes-and-fibers.model';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';

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

    this.assertOwnership(entity.ownerId);
    return entity;
  }

  public async findByIdWithNodes(id: string): Promise<ZoneWithNodesModel> {
    const entity = await this.repository.findByIdWithNodes(id);
    if (entity == null) {
      throw new NotFoundError();
    }

    this.assertOwnership(entity.zone.ownerId);
    return entity;
  }

  public async findByIdFull(id: string): Promise<ZoneWithNodesAndFibersModel> {
    const entity = await this.repository.findByIdFull(id);
    if (entity == null) {
      throw new NotFoundError();
    }

    this.assertOwnership(entity.zone.ownerId);
    return entity;
  }

  public findByOwnerId(ownerId?: string): Promise<ZoneWithNodesAndFibersModel[]> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    // No cross-company reads: an explicit ownerId must match the caller's company.
    if (ownerId != null && ownerId !== user.companyId) {
      throw new UnauthorizedError();
    }

    return this.repository.findByOwnerId(user.companyId);
  }

  public findAllActive(): Promise<ZoneEntity[]> {
    return this.repository.findAllActive();
  }

  public findLastZone(): Promise<ZoneWithNodesModel | null> {
    return this.repository.findLastZone();
  }

  public create(
    entity: CreateZoneDto,
    cidr: string,
    gateway: string,
  ): Promise<ZoneEntity> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const zone = new ZoneEntity(
      entity.name,
      getEventStateTransition(EventTypeKey.ZONE_CREATE).entry,
      cidr,
      gateway,
      user.userId,
      user.companyId,
      {
        description: entity.description,
      },
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
    });

    return this.save(updated);
  }

  /**
   * Queue the zone for deletion: validate, set the ZONE_DELETE entry status and
   * let the cloud-scripts processor tear down host config and mark it DELETED.
   * The DB row is never hard-deleted here — the processor needs it.
   */
  public async delete(id: string): Promise<void> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const data = await this.findByIdWithNodes(id);

    if (data.nodes.length > 0) {
      throw new Error('Zone has assigned nodes and cannot be deleted');
    }

    const deletable = [ResourceStatus.ACTIVE, ResourceStatus.FAILED];
    if (!deletable.includes(data.zone.status)) {
      throw new Error(
        `Zone must be ${deletable.join(' or ')} to be deleted (is ${data.zone.status})`,
      );
    }

    const updated = data.zone.clone({
      status: getEventStateTransition(EventTypeKey.ZONE_DELETE).entry,
      updatedBy: user.userId,
    });

    await this.repository.update(updated);
  }

  private save(entity: ZoneEntity): Promise<ZoneEntity> {
    if (entity.id == null) {
      return this.repository.create(entity);
    }

    return this.repository.update(entity);
  }

  private assertOwnership(ownerId: string): void {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    // Hide other companies' resources entirely rather than revealing they exist.
    if (ownerId !== user.companyId) {
      throw new NotFoundError();
    }
  }
}
