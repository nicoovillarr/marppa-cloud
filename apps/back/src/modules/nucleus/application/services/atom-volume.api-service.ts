import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { AtomVolumeService } from '@/nucleus/domain/services/atom-volume.service';
import { AtomVolumeResponseModel } from '../models/atom-volume.response-model';
import { CreateAtomVolumeDto } from '@/nucleus/presentation/dtos/create-atom-volume.dto';
import { UpdateAtomVolumeDto } from '@/nucleus/presentation/dtos/update-atom-volume.dto';
import { EventDispatchService } from '@/event/application/services/event-dispatch.service';
import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';
import { AtomVolumeEntity } from '@/nucleus/domain/entities/atom-volume.entity';

@Injectable()
export class AtomVolumeApiService {
  constructor(
    private readonly service: AtomVolumeService,
    private readonly eventDispatch: EventDispatchService,
  ) { }

  async findById(id: number): Promise<AtomVolumeResponseModel> {
    return this.toResponse(await this.service.findById(id));
  }

  async findByOwnerId(ownerId?: string): Promise<AtomVolumeResponseModel[]> {
    const list = await this.service.findByOwnerId(ownerId);
    return list.map((volume) => this.toResponse(volume));
  }

  async findByAtomId(atomId: string): Promise<AtomVolumeResponseModel[]> {
    const list = await this.service.findByAtomId(atomId);
    return list.map((volume) => this.toResponse(volume));
  }

  async create(data: CreateAtomVolumeDto): Promise<AtomVolumeResponseModel> {
    const entity = await this.service.create(data);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.ATOM_VOLUME_CREATE,
      primary: { type: 'AtomVolume', id: String(entity.id!) },
    });

    return this.toResponse(entity);
  }

  async update(
    id: number,
    data: UpdateAtomVolumeDto,
  ): Promise<AtomVolumeResponseModel> {
    return this.toResponse(await this.service.update(id, data));
  }

  async attach(id: number, atomId: string): Promise<AtomVolumeResponseModel> {
    await this.service.attach(id, atomId);
    return this.findById(id);
  }

  async detach(id: number): Promise<AtomVolumeResponseModel> {
    await this.service.detach(id);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.service.delete(id);

    await this.eventDispatch.dispatch({
      type: EventTypeKey.ATOM_VOLUME_DELETE,
      primary: { type: 'AtomVolume', id: String(id) },
    });
  }

  private toResponse(entity: AtomVolumeEntity): AtomVolumeResponseModel {
    return plainToInstance(AtomVolumeResponseModel, entity, {
      excludeExtraneousValues: true,
    });
  }
}
