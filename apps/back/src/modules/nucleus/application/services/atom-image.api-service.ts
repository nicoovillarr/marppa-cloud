import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { AtomImageService } from '@/nucleus/domain/services/atom-image.service';
import { AtomImageResponseModel } from '../models/atom-image.response-model';
import { CreateAtomImageDto } from '@/nucleus/presentation/dtos/create-atom-image.dto';
import { UpdateAtomImageDto } from '@/nucleus/presentation/dtos/update-atom-image.dto';
import { EventDispatchService } from '@/event/application/services/event-dispatch.service';

@Injectable()
export class AtomImageApiService {
  constructor(
    private readonly service: AtomImageService,
    private readonly eventDispatch: EventDispatchService,
  ) { }

  public async findById(id: number): Promise<AtomImageResponseModel> {
    const image = await this.service.findById(id);
    return plainToInstance(AtomImageResponseModel, image, {
      excludeExtraneousValues: true,
    });
  }

  public async findAll(): Promise<AtomImageResponseModel[]> {
    const images = await this.service.findAll();
    return plainToInstance(AtomImageResponseModel, images, {
      excludeExtraneousValues: true,
    });
  }

  public async create(
    data: CreateAtomImageDto,
  ): Promise<AtomImageResponseModel> {
    const image = await this.service.create(data);

    return plainToInstance(AtomImageResponseModel, image, {
      excludeExtraneousValues: true,
    });
  }

  public async update(
    id: number,
    data: UpdateAtomImageDto,
  ): Promise<AtomImageResponseModel> {
    const image = await this.service.update(id, data);

    return plainToInstance(AtomImageResponseModel, image, {
      excludeExtraneousValues: true,
    });
  }

  public async delete(id: number): Promise<void> {
    await this.service.delete(id);
  }
}
