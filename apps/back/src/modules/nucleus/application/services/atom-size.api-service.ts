import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { AtomSizeService } from '@/nucleus/domain/services/atom-size.service';
import { AtomSizeResponseModel } from '../models/atom-size.response-model';
import { CreateAtomSizeDto } from '@/nucleus/presentation/dtos/create-atom-size.dto';
import { UpdateAtomSizeDto } from '@/nucleus/presentation/dtos/update-atom-size.dto';
import { EventDispatchService } from '@/event/application/services/event-dispatch.service';

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
    return plainToInstance(AtomSizeResponseModel, size, {
      excludeExtraneousValues: true,
    });
  }

  async revise(
    id: number,
    data: UpdateAtomSizeDto,
  ): Promise<AtomSizeResponseModel> {
    const size = await this.service.revise(id, data);
    return plainToInstance(AtomSizeResponseModel, size, {
      excludeExtraneousValues: true,
    });
  }

  async restore(id: number): Promise<void> {
    await this.service.restore(id);
  }

  async deprecate(id: number): Promise<void> {
    await this.service.deprecate(id);
  }
}
