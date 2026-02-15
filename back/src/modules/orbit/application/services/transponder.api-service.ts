import { Injectable } from '@nestjs/common';
import { TransponderService } from '../../domain/services/transponder.service';
import { TransponderResponseModel } from '../models/transponder.response-model';
import { CreateTransponderDto } from '../../presentation/dtos/create-transponder.dto';
import { UpdateTransponderDto } from '../../presentation/dtos/update-transponder.dto';
import { plainToInstance } from 'class-transformer';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { EventService } from '@/event/domain/services/event.service';
import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';

@Injectable()
export class TransponderApiService {
  constructor(
    private readonly service: TransponderService,
    private readonly eventService: EventService,
  ) {}

  public async findById(
    portalId: string,
    transponderId: string,
  ): Promise<TransponderResponseModel> {
    const entity = await this.service.findById(portalId, transponderId);

    if (entity == null) {
      throw new NotFoundError();
    }

    return plainToInstance(TransponderResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  public async findByPortalId(
    portalId: string,
  ): Promise<TransponderResponseModel[]> {
    const list = await this.service.findByPortalId(portalId);
    return list.map((entity) =>
      plainToInstance(TransponderResponseModel, entity, {
        excludeExtraneousValues: true,
      }),
    );
  }

  public async create(
    portalId: string,
    dto: CreateTransponderDto,
  ): Promise<TransponderResponseModel> {
    const entity = await this.service.create(portalId, dto);

    const { id: eventId } = await this.eventService.create({
      type: EventTypeKey.TRANSPONDER_CREATE,
    });

    await this.eventService.addEventResource(eventId!, 'Portal', portalId);
    await this.eventService.addEventResource(
      eventId!,
      'Transponder',
      entity.id!.toString(),
    );

    return plainToInstance(TransponderResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  public async update(
    portalId: string,
    transponderId: string,
    dto: UpdateTransponderDto,
  ): Promise<TransponderResponseModel> {
    const entity = await this.service.update(portalId, transponderId, dto);

    const { id: eventId } = await this.eventService.create({
      type: EventTypeKey.TRANSPONDER_UPDATE,
    });

    await this.eventService.addEventResource(eventId!, 'Portal', portalId);
    await this.eventService.addEventResource(
      eventId!,
      'Transponder',
      transponderId,
    );

    return plainToInstance(TransponderResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  public async delete(portalId: string, transponderId: string): Promise<void> {
    await this.service.delete(portalId, transponderId);

    const { id: eventId } = await this.eventService.create({
      type: EventTypeKey.TRANSPONDER_DELETE,
    });

    await this.eventService.addEventResource(eventId!, 'Portal', portalId);
    await this.eventService.addEventResource(
      eventId!,
      'Transponder',
      transponderId,
    );
  }
}
