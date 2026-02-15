import { Injectable } from '@nestjs/common';
import { ZoneService } from '../../domain/services/zone.service';
import { plainToInstance } from 'class-transformer';
import { CreateZoneDto } from '../../presentation/dtos/create-zone.dto';
import { UpdateZoneDto } from '../../presentation/dtos/update-zone.dto';
import { ZoneResponseModel } from '../models/zone.response-model';
import { NetmaskService } from '../../domain/services/netmask.service';
import { EventService } from '@/event/domain/services/event.service';
import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';

@Injectable()
export class ZoneApiService {
  constructor(
    private readonly zoneService: ZoneService,
    private readonly netmaskService: NetmaskService,
    private readonly eventService: EventService,
  ) {}

  public async findById(id: string): Promise<ZoneResponseModel> {
    const entity = await this.zoneService.findById(id);
    return plainToInstance(ZoneResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  public async findByOwnerId(ownerId?: string): Promise<ZoneResponseModel[]> {
    const entities = await this.zoneService.findByOwnerId(ownerId);
    return plainToInstance(ZoneResponseModel, entities, {
      excludeExtraneousValues: true,
    });
  }

  public async create(data: CreateZoneDto): Promise<ZoneResponseModel> {
    const lastZone = await this.zoneService.findLastZone();

    const { cidr, gateway } = this.netmaskService.getNextCidr(
      lastZone?.zone.cidr,
      8,
    );

    const entity = await this.zoneService.create(data, cidr, gateway);

    const { id: eventId } = await this.eventService.create({
      type: EventTypeKey.ZONE_CREATE,
    });

    await this.eventService.addEventResource(
      eventId!,
      'Zone',
      entity.id!.toString(),
    );

    return plainToInstance(ZoneResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  public async update(
    id: string,
    data: UpdateZoneDto,
  ): Promise<ZoneResponseModel> {
    const entity = await this.zoneService.update(id, data);
    return plainToInstance(ZoneResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  public async delete(id: string): Promise<void> {
    await this.zoneService.delete(id);

    const { id: eventId } = await this.eventService.create({
      type: EventTypeKey.ZONE_DELETE,
    });

    await this.eventService.addEventResource(eventId!, 'Zone', id);
  }
}
