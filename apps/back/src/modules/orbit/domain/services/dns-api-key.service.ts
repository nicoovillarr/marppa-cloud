import { Inject, Injectable } from '@nestjs/common';
import { EventTypeKey, getEventStateTransition } from '@marppa-cloud/api-types';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { ConflictError } from '@/shared/domain/errors/conflict.error';
import { BadRequestError } from '@/shared/domain/errors/bad-request.error';
import { ResourceStatus } from '@/shared/domain/enums/resource-status.enum';
import { authorize } from '@/shared/domain/policy/authorize';
import { CompanyHierarchyService } from '@/shared/domain/services/company-hierarchy.service';
import {
  DNS_API_KEY_REPOSITORY,
  DnsApiKeyRepository,
} from '../repositories/dns-api-key.repository';
import {
  PORTAL_REPOSITORY,
  PortalRepository,
} from '../repositories/portal.repository';
import { DnsApiKeyEntity } from '../entities/dns-api-key.entity';
import { DnsApiKeyWithUsageModel } from '../models/dns-api-key-with-usage.model';
import { PortalEntity } from '../entities/portal.entity';
import { PortalType } from '../enum/portal-type.enum';
import { DNS_PROVIDER, DnsProvider } from './dns-provider.service';

export interface CreateDnsApiKeyInput {
  name: string;
  description?: string;
  type: PortalType;
  apiKey: string;
}

export interface UpdateDnsApiKeyInput {
  name?: string;
  description?: string | null;
  apiKey?: string;
}

export interface DnsApiKeyUpdateResult {
  dnsApiKey: DnsApiKeyEntity;
  resyncedPortals: PortalEntity[];
}

const RESYNCABLE_PORTAL_STATUSES: ResourceStatus[] = [
  ResourceStatus.ACTIVE,
  ResourceStatus.FAILED,
];

@Injectable()
export class DnsApiKeyService {
  constructor(
    @Inject(DNS_API_KEY_REPOSITORY)
    private readonly repository: DnsApiKeyRepository,

    @Inject(PORTAL_REPOSITORY)
    private readonly portalRepository: PortalRepository,

    @Inject(DNS_PROVIDER)
    private readonly dnsProvider: DnsProvider,

    private readonly companyHierarchyService: CompanyHierarchyService,
  ) { }

  public async findById(id: number): Promise<DnsApiKeyEntity> {
    const key = await this.repository.findById(id);
    if (key == null) {
      throw new NotFoundError();
    }

    authorize('manage', 'DnsApiKey', key.ownerId);
    return key;
  }

  public async findByOwnerIdWithUsage(ownerId?: string): Promise<DnsApiKeyWithUsageModel[]> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const readable = await this.companyHierarchyService.selfAndDescendants(user.companyId);
    if (ownerId != null && !readable.includes(ownerId)) {
      throw new UnauthorizedError();
    }

    return this.repository.findByOwnerIdsWithUsage(
      ownerId != null ? [ownerId] : readable,
    );
  }

  public async findUsableForPortal(id: number, type: PortalType): Promise<DnsApiKeyEntity> {
    const key = await this.findById(id);

    if (key.type !== type) {
      throw new BadRequestError(
        `API key "${key.name}" is for ${key.type}, not ${type}.`,
      );
    }

    return key;
  }

  public async create(data: CreateDnsApiKeyInput): Promise<DnsApiKeyEntity> {
    const user = getCurrentUser();
    if (user == null) {
      throw new UnauthorizedError();
    }

    const name = data.name.trim();
    await this.assertNameAvailable(user.companyId, name);

    return this.repository.create(
      new DnsApiKeyEntity(name, data.type, data.apiKey.trim(), user.userId, user.companyId, {
        description: this.normalizeDescription(data.description),
      }),
    );
  }

  public async update(id: number, data: UpdateDnsApiKeyInput): Promise<DnsApiKeyUpdateResult> {
    const user = getCurrentUser();
    if (user == null) {
      throw new UnauthorizedError();
    }

    const key = await this.findById(id);

    const name = data.name?.trim();
    if (name != null && name !== key.name) {
      await this.assertNameAvailable(key.ownerId, name);
    }

    const apiKey = data.apiKey?.trim();
    const rotated = apiKey != null && apiKey !== key.apiKey;

    const portals = rotated
      ? await this.portalRepository.findLiveByDnsApiKeyId(id)
      : [];

    for (const portal of portals) {
      await this.dnsProvider.assertCanManage(key.type, portal.address, apiKey!);
    }

    const updated = await this.repository.update(
      key.clone({
        name,
        apiKey,
        description: data.description === undefined
          ? undefined
          : this.normalizeDescription(data.description),
        updatedBy: user.userId,
      }),
    );

    const resyncedPortals: PortalEntity[] = [];
    for (const portal of portals) {
      if (!RESYNCABLE_PORTAL_STATUSES.includes(portal.status)) {
        continue;
      }

      resyncedPortals.push(
        await this.portalRepository.update(
          portal.clone({
            status: getEventStateTransition(EventTypeKey.PORTAL_UPDATE).entry,
            updatedBy: user.userId,
          }),
        ),
      );
    }

    return { dnsApiKey: updated, resyncedPortals };
  }

  public async delete(id: number): Promise<void> {
    const key = await this.findById(id);

    const inUse = await this.repository.countLivePortals(key.id!);
    if (inUse > 0) {
      throw new ConflictError(
        `API key "${key.name}" is used by ${inUse} portal${inUse === 1 ? '' : 's'}. Move them to another key first.`,
      );
    }

    await this.repository.delete(key.id!);
  }

  private normalizeDescription(description?: string | null): string | null {
    const trimmed = description?.trim();
    return trimmed ? trimmed : null;
  }

  private async assertNameAvailable(ownerId: string, name: string): Promise<void> {
    const existing = await this.repository.findByOwnerIdAndName(ownerId, name);
    if (existing != null) {
      throw new ConflictError(`An API key named "${name}" already exists.`);
    }
  }
}
