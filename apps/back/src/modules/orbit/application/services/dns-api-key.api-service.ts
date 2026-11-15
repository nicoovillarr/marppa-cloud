import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { EventDispatchService } from '@/event/application/services/event-dispatch.service';
import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';
import { DnsApiKeyService } from '../../domain/services/dns-api-key.service';
import { DnsApiKeyEntity } from '../../domain/entities/dns-api-key.entity';
import { DnsApiKeyResponseModel } from '../models/dns-api-key.response-model';
import { CreateDnsApiKeyDto } from '../../presentation/dtos/create-dns-api-key.dto';
import { UpdateDnsApiKeyDto } from '../../presentation/dtos/update-dns-api-key.dto';

@Injectable()
export class DnsApiKeyApiService {
  constructor(
    private readonly service: DnsApiKeyService,
    private readonly eventDispatch: EventDispatchService,
  ) { }

  public async findByOwnerId(ownerId?: string): Promise<DnsApiKeyResponseModel[]> {
    const list = await this.service.findByOwnerIdWithUsage(ownerId);
    return list.map((model) => this.toResponse(model.dnsApiKey, model.portalCount));
  }

  public async create(data: CreateDnsApiKeyDto): Promise<DnsApiKeyResponseModel> {
    const entity = await this.service.create(data);
    return this.toResponse(entity, 0);
  }

  public async update(id: number, data: UpdateDnsApiKeyDto): Promise<DnsApiKeyResponseModel> {
    const { dnsApiKey, resyncedPortals } = await this.service.update(id, data);

    for (const portal of resyncedPortals) {
      await this.eventDispatch.dispatch({
        type: EventTypeKey.PORTAL_UPDATE,
        primary: { type: 'Portal', id: portal.id! },
      });
    }

    const usage = await this.service.findByOwnerIdWithUsage(dnsApiKey.ownerId);
    const portalCount = usage.find((model) => model.dnsApiKey.id === id)?.portalCount ?? 0;

    return this.toResponse(dnsApiKey, portalCount);
  }

  public async delete(id: number): Promise<void> {
    await this.service.delete(id);
  }

  private toResponse(entity: DnsApiKeyEntity, portalCount: number): DnsApiKeyResponseModel {
    return plainToInstance(
      DnsApiKeyResponseModel,
      { ...entity.toObject(), portalCount },
      { excludeExtraneousValues: true },
    );
  }
}
