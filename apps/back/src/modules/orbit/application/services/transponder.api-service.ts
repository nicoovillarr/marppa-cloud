import { Injectable } from '@nestjs/common';
import { TransponderService } from '../../domain/services/transponder.service';
import { TransponderResponseModel } from '../models/transponder.response-model';
import { CreateTransponderDto } from '../../presentation/dtos/create-transponder.dto';
import { UpdateTransponderDto } from '../../presentation/dtos/update-transponder.dto';
import { plainToInstance } from 'class-transformer';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { EventDispatchService } from '@/event/application/services/event-dispatch.service';
import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';

@Injectable()
export class TransponderApiService {
  constructor(
    private readonly service: TransponderService,
    private readonly eventDispatch: EventDispatchService,
  ) { }

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

    await this.eventDispatch.dispatch({
      type: EventTypeKey.TRANSPONDER_CREATE,
      primary: { type: 'Transponder', id: entity.id!.toString() },
      parent: { type: 'Portal', id: portalId },
    });

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

    await this.eventDispatch.dispatch({
      type: EventTypeKey.TRANSPONDER_UPDATE,
      primary: { type: 'Transponder', id: transponderId },
      parent: { type: 'Portal', id: portalId },
    });

    return plainToInstance(TransponderResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  public async delete(portalId: string, transponderId: string): Promise<void> {
    await this.service.delete(portalId, transponderId);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.TRANSPONDER_DELETE,
      primary: { type: 'Transponder', id: transponderId },
      parent: { type: 'Portal', id: portalId },
    });
  }
}
