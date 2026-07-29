import { Inject, Injectable } from '@nestjs/common';
import {
  PORTAL_REPOSITORY,
  PortalRepository,
} from '../repositories/portal.repository';
import { CreatePortalDto } from '../../presentation/dtos/create-portal.dto';
import { PortalEntity } from '../entities/portal.entity';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { UpdatePortalDto } from '../../presentation/dtos/update-portal.dto';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import {
  EventTypeKey,
  SUPPORTED_PORTAL_TYPES,
  getEventStateTransition,
} from '@marppa-cloud/api-types';
import { PortalWithTranspondersWithNodeModel } from '../models/portal-with-transponders-with-node.model';
import { ZoneService } from '@/mesh/domain/services/zone.service';
import { DNS_PROVIDER, DnsProvider } from './dns-provider.service';
import { assertCompanyOwnership } from '@/shared/domain/services/ownership.service';

@Injectable()
export class PortalService {
  constructor(
    @Inject(PORTAL_REPOSITORY)
    private readonly portalRepository: PortalRepository,
    private readonly zoneService: ZoneService,

    @Inject(DNS_PROVIDER)
    private readonly dnsProvider: DnsProvider,
  ) { }

  public getPortalTypes(): string[] {
    return [...SUPPORTED_PORTAL_TYPES];
  }

  public async findById(id: string): Promise<PortalEntity> {
    const portal = await this.portalRepository.findById(id);
    if (portal == null) {
      throw new NotFoundError();
    }

    assertCompanyOwnership(portal.ownerId);
    return portal;
  }

  public async findByIdWithTranspondersWithNode(
    id: string,
  ): Promise<PortalWithTranspondersWithNodeModel> {
    const model =
      await this.portalRepository.findByIdWithTranspondersWithNode(id);
    if (model == null) {
      throw new NotFoundError();
    }

    assertCompanyOwnership(model.portal.ownerId);
    return model;
  }

  public findByOwnerId(ownerId?: string): Promise<PortalEntity[]> {
    const user = getCurrentUser();
    if (user == null) {
      throw new UnauthorizedError();
    }

    if (ownerId != null && ownerId !== user.companyId) {
      throw new UnauthorizedError();
    }

    return this.portalRepository.findByOwnerId(user.companyId);
  }

  public async create(data: CreatePortalDto): Promise<PortalEntity> {
    const user = getCurrentUser();
    if (user == null) {
      throw new UnauthorizedError();
    }

    await this.assertOwnedZone(data.zoneId);
    await this.dnsProvider.assertCanManage(data.type, data.address, data.apiKey);

    const portal = new PortalEntity(
      data.name,
      data.address,
      data.type,
      data.apiKey,
      getEventStateTransition(EventTypeKey.PORTAL_CREATE).entry,
      user.userId,
      user.companyId,
      {
        description: data.description,
        enableCompression: data.enableCompression,
        corsEnabled: data.corsEnabled,
        zoneId: data.zoneId,
      },
    );

    return this.portalRepository.create(portal);
  }

  public async update(id: string, data: UpdatePortalDto): Promise<PortalEntity> {
    const user = getCurrentUser();
    if (user == null) {
      throw new UnauthorizedError();
    }

    const portal = await this.findById(id);

    await this.assertOwnedZone(data.zoneId);

    if (data.address != null || data.apiKey != null) {
      await this.dnsProvider.assertCanManage(
        data.type ?? portal.type,
        data.address ?? portal.address,
        data.apiKey ?? portal.apiKey,
      );
    }

    const entity = portal.clone({
      name: data.name,
      description: data.description,
      address: data.address,
      type: data.type,
      apiKey: data.apiKey,
      enableCompression: data.enableCompression,
      corsEnabled: data.corsEnabled,
      zoneId: data.zoneId,
      status: getEventStateTransition(EventTypeKey.PORTAL_UPDATE).entry,
      updatedBy: user.userId,
    });

    return this.portalRepository.update(entity);
  }

  public async delete(id: string): Promise<void> {
    const user = getCurrentUser();
    if (user == null) {
      throw new UnauthorizedError();
    }

    const portal = await this.findById(id);

    const deletable: ResourceStatus[] = [
      ResourceStatus.ACTIVE,
      ResourceStatus.FAILED,
    ];
    if (!deletable.includes(portal.status)) {
      throw new Error(
        `Portal must be ${deletable.join(' or ')} to be deleted (is ${portal.status})`,
      );
    }

    const queued = portal.clone({
      status: getEventStateTransition(EventTypeKey.PORTAL_DELETE).entry,
      updatedBy: user.userId,
    });

    await this.portalRepository.update(queued);
  }

  private async assertOwnedZone(zoneId?: string): Promise<void> {
    if (zoneId == null) {
      return;
    }

    await this.zoneService.findById(zoneId);
  }
}
