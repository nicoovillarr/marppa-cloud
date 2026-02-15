import { Injectable } from '@nestjs/common';
import { PortalService } from '../../domain/services/portal.service';
import { plainToInstance } from 'class-transformer';
import { PortalResponseModel } from '../models/portal.response-model';
import { NotFoundError } from '@/shared/domain/errors/not-found.error';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';
import { CreatePortalDto } from '../../presentation/dtos/create-portal.dto';
import { UpdatePortalDto } from '../../presentation/dtos/update-portal.dto';
import { EventService } from '@/event/domain/services/event.service';
import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';

@Injectable()
export class PortalApiService {
  constructor(
    private readonly service: PortalService,
    private readonly eventService: EventService,
  ) {}

  public async findById(id: string): Promise<PortalResponseModel> {
    const entity = await this.service.findById(id);
    if (entity == null) {
      throw new NotFoundError();
    }

    return plainToInstance(PortalResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  public async findByOwnerId(ownerId?: string): Promise<PortalResponseModel[]> {
    if (ownerId == null) {
      const user = getCurrentUser();
      if (user == null) {
        throw new UnauthorizedError();
      }

      ownerId = user.companyId;
    }

    const list = await this.service.findByOwnerId(ownerId);
    return list.map((entity) =>
      plainToInstance(PortalResponseModel, entity, {
        excludeExtraneousValues: true,
      }),
    );
  }

  public async create(data: CreatePortalDto): Promise<PortalResponseModel> {
    const entity = await this.service.create(data);

    const { id: eventId } = await this.eventService.create({
      type: EventTypeKey.PORTAL_CREATE,
    });

    await this.eventService.addEventResource(
      eventId!,
      'Portal',
      entity.id!.toString(),
    );

    return plainToInstance(PortalResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  public async update(
    id: string,
    data: UpdatePortalDto,
  ): Promise<PortalResponseModel> {
    const entity = await this.service.update(id, data);

    const { id: eventId } = await this.eventService.create({
      type: EventTypeKey.PORTAL_UPDATE,
    });

    await this.eventService.addEventResource(
      eventId!,
      'Portal',
      entity.id!.toString(),
    );

    return plainToInstance(PortalResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }

  public async delete(id: string): Promise<void> {
    await this.service.delete(id);

    const { id: eventId } = await this.eventService.create({
      type: EventTypeKey.PORTAL_DELETE,
    });

    await this.eventService.addEventResource(eventId!, 'Portal', id);
  }
}
