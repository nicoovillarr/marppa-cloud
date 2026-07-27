import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { AtomImageService } from '@/nucleus/domain/services/atom-image.service';
import { AtomImageResponseModel } from '../models/atom-image.response-model';

@Injectable()
export class AtomImageApiService {
  constructor(private readonly service: AtomImageService) { }

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
}
