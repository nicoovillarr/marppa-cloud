import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { AtomSizeService } from '@/nucleus/domain/services/atom-size.service';
import { AtomSizeResponseModel } from '../models/atom-size.response-model';
import { CreateAtomSizeDto } from '@/nucleus/presentation/dtos/create-atom-size.dto';
import { UpdateAtomSizeDto } from '@/nucleus/presentation/dtos/update-atom-size.dto';
import { EventDispatchService } from '@/event/application/services/event-dispatch.service';
import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';

@Injectable()
export class AtomSizeApiService {
  constructor(
    private readonly service: AtomSizeService,
    private readonly eventDispatch: EventDispatchService,
  ) { }

  async findAll(includeDeprecated = false): Promise<AtomSizeResponseModel[]> {
    const sizes = await this.service.findAll(includeDeprecated);
    return plainToInstance(AtomSizeResponseModel, sizes, {
      excludeExtraneousValues: true,
    });
  }

  async findById(id: number): Promise<AtomSizeResponseModel> {
    const size = await this.service.findById(id);
    return plainToInstance(AtomSizeResponseModel, size, {
      excludeExtraneousValues: true,
    });
  }

  async create(data: CreateAtomSizeDto): Promise<AtomSizeResponseModel> {
    const size = await this.service.create(data);
    await this.audit(EventTypeKey.ADMIN_CATALOG_CREATED, size.id!, size.name);
    return plainToInstance(AtomSizeResponseModel, size, {
      excludeExtraneousValues: true,
    });
  }

  async revise(
    id: number,
    data: UpdateAtomSizeDto,
  ): Promise<AtomSizeResponseModel> {
    const size = await this.service.revise(id, data);
    await this.audit(EventTypeKey.ADMIN_CATALOG_UPDATED, size.id!, size.name);
    return plainToInstance(AtomSizeResponseModel, size, {
      excludeExtraneousValues: true,
    });
  }

  async restore(id: number): Promise<void> {
    await this.service.restore(id);

    const size = await this.service.findById(id);
    await this.audit(EventTypeKey.ADMIN_CATALOG_RESTORED, id, size.name);
  }

  async deprecate(id: number): Promise<void> {
    const size = await this.service.findById(id);
    await this.service.deprecate(id);
    await this.audit(EventTypeKey.ADMIN_CATALOG_DEPRECATED, id, size.name);
  }

  private audit(type: EventTypeKey, id: number, name: string): Promise<number> {
    return this.eventDispatch.record({
      type,
      primary: { type: 'AtomSize', id: String(id) },
      properties: { name },
    });
  }
}
